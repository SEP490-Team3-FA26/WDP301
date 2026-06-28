import {
  Controller,
  Post,
  Body,
  Get,
  Inject,
  OnModuleInit,
  HttpCode,
  HttpStatus,
  HttpException,
  UseGuards,
  Request,
  Req,
  Res,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClientKafka } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { lastValueFrom } from 'rxjs';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { VerifyTwoFactorDto, AuthenticateTwoFactorDto } from '../dto/two-factor.dto';
import { VerifyEmailDto, ResendVerificationDto } from '../dto/verify-email.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('🔐 Authentication')
@Controller('api/auth')
export class AuthController implements OnModuleInit {
  // TTL cache: 1 giờ (tính bằng mili-giây)
  private readonly CACHE_TTL = 3600 * 1000;

  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) { }

  /**
   * Đăng ký các Reply Topic để nhận phản hồi từ Auth Microservice qua Kafka
   * NestJS Kafka Request-Response cần đăng ký reply topic trước khi kết nối
   */
  async onModuleInit() {
    await subscribeToKafkaTopics(this.kafkaClient, [
      'auth.login',
      'auth.register',
      'auth.google.login',
      'auth.validate.token',
      'auth.get.user.by.id',
      'auth.forgot.password',
      'auth.reset.password',
      'auth.2fa.generate',
      'auth.2fa.enable',
      'auth.2fa.disable',
      'auth.2fa.authenticate',
      'auth.verify.email',
      'auth.resend.verification',
    ]);
    console.log('✅ [API Gateway] Đã kết nối tới Kafka và đăng ký Reply Topics');
  }

  // ============================================================
  // POST /api/auth/register — Đăng ký tài khoản mới
  // ============================================================
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
  @ApiResponse({ status: 409, description: 'Email đã tồn tại' })
  async register(@Body() dto: RegisterDto) {
    console.log(`📤 [API Gateway] Gửi yêu cầu đăng ký tới Kafka: ${dto.email}`);

    // Gửi qua Kafka -> Auth Microservice và chờ kết quả
    return await sendKafkaMessage(this.kafkaClient, 'auth.register', JSON.stringify(dto));
  }

  // ============================================================
  // POST /api/auth/forgot-password — Yêu cầu quên mật khẩu
  // ============================================================
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Yêu cầu mã xác nhận qua email để đổi mật khẩu' })
  @ApiResponse({ status: 200, description: 'Đã gửi mã xác nhận' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return await sendKafkaMessage(this.kafkaClient, 'auth.forgot.password', JSON.stringify(dto));
  }

  // ============================================================
  // POST /api/auth/reset-password — Đặt lại mật khẩu
  // ============================================================
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu mới bằng mã OTP' })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return await sendKafkaMessage(this.kafkaClient, 'auth.reset.password', JSON.stringify(dto));
  }

  // =========================================================================
  // GOOGLE OAUTH2
  // =========================================================================
  
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Bắt đầu luồng đăng nhập Google' })
  async googleAuth(@Req() req) {
    // Sẽ được Passport tự động redirect sang Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google Callback' })
  async googleAuthRedirect(@Req() req, @Res() res) {
    // Lúc này req.user đã chứa thông tin profile từ GoogleStrategy
    // Gửi event 'auth.google.login' qua Kafka để Auth Microservice xử lý cấp JWT
    const result: any = await lastValueFrom(
      this.kafkaClient.send('auth.google.login', req.user)
    );

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (result.error) {
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(result.message)}`);
    }

    // Redirect về Frontend kèm JWT Token
    return res.redirect(`${frontendUrl}/login?token=${result.access_token}`);
  }

  // ============================================================
  // POST /api/auth/login — Đăng nhập
  // ============================================================
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập tài khoản' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công, trả về JWT token' })
  @ApiResponse({ status: 401, description: 'Sai email hoặc mật khẩu' })
  async login(@Body() dto: LoginDto) {
    // Kiểm tra Redis xem user này đã có token còn hạn chưa (Cache-Aside)
    const cacheKey = `auth:session:${dto.email}`;
    const cachedSession = await this.cacheManager.get(cacheKey);
    if (cachedSession) {
      console.log(`⚡ [Cache Hit] Lấy session của ${dto.email} từ Redis`);
      return cachedSession;
    }

    console.log(`📤 [API Gateway] Gửi yêu cầu đăng nhập tới Kafka: ${dto.email}`);

    // Cache Miss -> Gửi qua Kafka -> Auth Microservice để xác thực
    const result: any = await sendKafkaMessage(this.kafkaClient, 'auth.login', JSON.stringify(dto));

    // Chỉ lưu kết quả vào Redis khi không yêu cầu xác thực 2 lớp (2FA)
    if (result && !result.is2faRequired) {
      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
      console.log(`💾 [Cache Set] Lưu session của ${dto.email} vào Redis (TTL: 1h)`);
    }

    return result;
  }

  // ============================================================
  // POST /api/auth/logout — Đăng xuất
  // ============================================================
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Đăng xuất tài khoản' })
  async logout(@Request() req) {
    const { email, sub: userId } = req.user;

    // Xóa session cache của user trong Redis
    await this.cacheManager.del(`auth:session:${email}`);
    console.log(`🗑️ [Cache Del] Đã xóa session của ${email} khỏi Redis`);

    // Bắn event bất đồng bộ để ghi Audit Log (fire-and-forget)
    this.kafkaClient.emit('auth.event.logout', JSON.stringify({ userId, email }));

    return { message: 'Đăng xuất thành công!' };
  }

  // ============================================================
  // GET /api/auth/profile — Lấy thông tin cá nhân
  // ============================================================
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin tài khoản đang đăng nhập' })
  @ApiResponse({ status: 200, description: 'Thông tin profile' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async getProfile(@Request() req) {
    const { sub: userId } = req.user;

    // Kiểm tra cache
    const cacheKey = `auth:profile:${userId}`;
    const cachedProfile = await this.cacheManager.get(cacheKey);
    if (cachedProfile) {
      console.log(`⚡ [Cache Hit] Lấy profile ${userId} từ Redis`);
      return cachedProfile;
    }

    // Lấy từ Auth Microservice qua Kafka
    const profile = await sendKafkaMessage(this.kafkaClient, 'auth.get.user.by.id', userId);

    // Lưu vào cache
    await this.cacheManager.set(cacheKey, profile, this.CACHE_TTL);
    return profile;
  }

  // ============================================================
  // POST /api/auth/2fa/generate — Sinh mã 2FA QR Code
  // ============================================================
  @Post('2fa/generate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sinh mã QR Code và Secret Key để thiết lập 2FA' })
  async generate2fa(@Request() req) {
    const { sub: userId } = req.user;
    return await sendKafkaMessage(this.kafkaClient, 'auth.2fa.generate', userId);
  }

  // ============================================================
  // POST /api/auth/2fa/enable — Kích hoạt 2FA
  // ============================================================
  @Post('2fa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kích hoạt xác thực 2 lớp (2FA)' })
  async enable2fa(@Request() req, @Body() dto: VerifyTwoFactorDto) {
    const { sub: userId } = req.user;
    const result = await sendKafkaMessage(
      this.kafkaClient,
      'auth.2fa.enable',
      JSON.stringify({ userId, token: dto.token }),
    );

    // Xóa cache session cũ của user nếu có để cập nhật thông tin mới
    await this.cacheManager.del(`auth:session:${req.user.email}`);
    await this.cacheManager.del(`auth:profile:${userId}`);
    return result;
  }

  // ============================================================
  // POST /api/auth/2fa/disable — Hủy kích hoạt 2FA
  // ============================================================
  @Post('2fa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hủy kích hoạt xác thực 2 lớp (2FA)' })
  async disable2fa(@Request() req, @Body() dto: VerifyTwoFactorDto) {
    const { sub: userId } = req.user;
    const result = await sendKafkaMessage(
      this.kafkaClient,
      'auth.2fa.disable',
      JSON.stringify({ userId, token: dto.token }),
    );

    await this.cacheManager.del(`auth:session:${req.user.email}`);
    await this.cacheManager.del(`auth:profile:${userId}`);
    return result;
  }

  // ============================================================
  // POST /api/auth/2fa/authenticate — Đăng nhập bước 2 (Xác thực OTP)
  // ============================================================
  @Post('2fa/authenticate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác thực OTP 2FA hoàn tất đăng nhập' })
  async authenticate2fa(@Body() dto: AuthenticateTwoFactorDto) {
    const result: any = await sendKafkaMessage(
      this.kafkaClient,
      'auth.2fa.authenticate',
      JSON.stringify({ tempToken: dto.tempToken, token: dto.token }),
    );

    // Lưu phiên đăng nhập thành công vào Redis cache
    if (result && result.access_token && result.user) {
      const cacheKey = `auth:session:${result.user.email}`;
      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
      console.log(`💾 [Cache Set] Lưu session của ${result.user.email} vào Redis sau 2FA`);
    }

    return result;
  }

  // ============================================================
  // POST /api/auth/verify-email — Xác thực email đăng ký tài khoản
  // ============================================================
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xác thực địa chỉ email bằng mã OTP khi đăng ký' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return await sendKafkaMessage(
      this.kafkaClient,
      'auth.verify.email',
      JSON.stringify(dto),
    );
  }

  // ============================================================
  // POST /api/auth/resend-verification — Gửi lại mã OTP kích hoạt tài khoản
  // ============================================================
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gửi lại mã OTP xác thực email kích hoạt tài khoản' })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return await sendKafkaMessage(
      this.kafkaClient,
      'auth.resend.verification',
      JSON.stringify(dto),
    );
  }
}
