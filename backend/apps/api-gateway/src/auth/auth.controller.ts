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
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { lastValueFrom } from 'rxjs';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('🔐 Authentication')
@Controller('api/auth')
export class AuthGwController implements OnModuleInit {
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
    this.kafkaClient.subscribeToResponseOf('auth.login');
    this.kafkaClient.subscribeToResponseOf('auth.register');
    this.kafkaClient.subscribeToResponseOf('auth.validate.token');
    this.kafkaClient.subscribeToResponseOf('auth.get.user.by.id');
    await this.kafkaClient.connect();
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
    const result: any = await lastValueFrom(
      this.kafkaClient.send('auth.register', JSON.stringify(dto)),
    );

    // Nếu auth-service trả về lỗi, ném HttpException cho client
    if (result?.error) {
      throw new HttpException(result.message, result.statusCode || 400);
    }

    return result;
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
    const result: any = await lastValueFrom(
      this.kafkaClient.send('auth.login', JSON.stringify(dto)),
    );

    // Nếu auth-service trả về lỗi
    if (result?.error) {
      throw new HttpException(result.message, result.statusCode || 401);
    }

    // Lưu kết quả vào Redis (TTL 1 giờ) để lần sau đăng nhập nhanh hơn
    await this.cacheManager.set(cacheKey, result, this.CACHE_TTL);
    console.log(`💾 [Cache Set] Lưu session của ${dto.email} vào Redis (TTL: 1h)`);

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
    const profile: any = await lastValueFrom(
      this.kafkaClient.send('auth.get.user.by.id', userId),
    );

    if (profile?.error) {
      throw new HttpException(profile.message, profile.statusCode || 404);
    }

    // Lưu vào cache
    await this.cacheManager.set(cacheKey, profile, this.CACHE_TTL);
    return profile;
  }
}
