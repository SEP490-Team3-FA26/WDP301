import { Controller } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * Auth Microservice Controller
 * Lắng nghe Message/Event từ Kafka và xử lý nghiệp vụ xác thực
 */
@Controller()
export class AuthMsController {
  constructor(private readonly authService: AuthService) {}

  // =========================================================================
  // REQUEST-RESPONSE PATTERN (Dùng kafkaClient.send())
  // Gateway gửi yêu cầu và chờ kết quả trả về (đồng bộ)
  // =========================================================================

  /**
   * Topic: auth.login
   * API Gateway gửi thông tin đăng nhập, service xác thực và trả về JWT
   */
  @MessagePattern('auth.login')
  async handleLogin(@Payload() data: string) {
    try {
      const dto: LoginDto = typeof data === 'string' ? JSON.parse(data) : data;
      console.log(`📨 [Auth MS] Nhận yêu cầu đăng nhập: ${dto.email}`);
      return await this.authService.login(dto);
    } catch (error) {
      console.error(`❌ [Auth MS] Lỗi đăng nhập:`, error.message);
      // Trả lỗi về Gateway qua Kafka Reply Topic
      return { error: true, message: error.message, statusCode: error.status || 401 };
    }
  }

  /**
   * Topic: auth.register
   * API Gateway gửi thông tin đăng ký, service tạo tài khoản mới
   */
  @MessagePattern('auth.register')
  async handleRegister(@Payload() data: string) {
    try {
      const dto: RegisterDto = typeof data === 'string' ? JSON.parse(data) : data;
      console.log(`📨 [Auth MS] Nhận yêu cầu đăng ký: ${dto.email}`);
      return await this.authService.register(dto);
    } catch (error) {
      console.error(`❌ [Auth MS] Lỗi đăng ký:`, error.message);
      return { error: true, message: error.message, statusCode: error.status || 400 };
    }
  }

  /**
   * Topic: auth.validate.token
   * API Gateway gửi token để xác minh tính hợp lệ (dùng trong JWT Guard)
   */
  @MessagePattern('auth.validate.token')
  async handleValidateToken(@Payload() token: string) {
    try {
      const payload = await this.authService.validateToken(token);
      return { valid: true, payload };
    } catch (error) {
      return { valid: false, message: error.message };
    }
  }

  /**
   * Topic: auth.google.login
   */
  @MessagePattern('auth.google.login')
  async handleGoogleLogin(@Payload() data: any) {
    try {
      return await this.authService.googleLogin(data);
    } catch (error) {
      console.error(`❌ [Auth MS] Lỗi Google Login:`, error.message);
      return { error: true, message: error.message, statusCode: error.status || 400 };
    }
  }

  /**
   * Topic: auth.forgot.password
   */
  @MessagePattern('auth.forgot.password')
  async handleForgotPassword(@Payload() data: string) {
    try {
      const dto = typeof data === 'string' ? JSON.parse(data) : data;
      console.log(`📨 [Auth MS] Yêu cầu quên mật khẩu: ${dto.email}`);
      return await this.authService.generateAndSendResetToken(dto.email);
    } catch (error) {
      console.error(`❌ [Auth MS] Lỗi quên mật khẩu:`, error.message);
      return { error: true, message: error.message, statusCode: error.status || 400 };
    }
  }

  /**
   * Topic: auth.reset.password
   */
  @MessagePattern('auth.reset.password')
  async handleResetPassword(@Payload() data: string) {
    try {
      const dto = typeof data === 'string' ? JSON.parse(data) : data;
      console.log(`📨 [Auth MS] Yêu cầu đặt lại mật khẩu cho: ${dto.email}`);
      return await this.authService.resetPassword(dto.email, dto.token, dto.newPassword);
    } catch (error) {
      console.error(`❌ [Auth MS] Lỗi đặt lại mật khẩu:`, error.message);
      return { error: true, message: error.message, statusCode: error.status || 400 };
    }
  }

  /**
   * Topic: auth.get.user.by.id
   * Lấy thông tin user theo ID (dùng cho profile)
   */
  @MessagePattern('auth.get.user.by.id')
  async handleGetUser(@Payload() id: string) {
    try {
      return await this.authService.getUserById(id);
    } catch (error) {
      return { error: true, message: error.message, statusCode: error.status || 404 };
    }
  }

  /**
   * Topic: auth.2fa.generate
   */
  @MessagePattern('auth.2fa.generate')
  async handleGenerate2fa(@Payload() userId: string) {
    try {
      console.log(`📨 [Auth MS] Yêu cầu sinh mã 2FA Secret cho user: ${userId}`);
      return await this.authService.generateTwoFactorSecret(userId);
    } catch (error) {
      console.error(`❌ [Auth MS] Lỗi sinh mã 2FA:`, error.message);
      return { error: true, message: error.message, statusCode: error.status || 400 };
    }
  }

  /**
   * Topic: auth.2fa.enable
   */
  @MessagePattern('auth.2fa.enable')
  async handleEnable2fa(@Payload() data: string) {
    try {
      const { userId, token } = typeof data === 'string' ? JSON.parse(data) : data;
      console.log(`📨 [Auth MS] Yêu cầu kích hoạt 2FA cho user: ${userId}`);
      return await this.authService.enableTwoFactor(userId, token);
    } catch (error) {
      console.error(`❌ [Auth MS] Lỗi kích hoạt 2FA:`, error.message);
      return { error: true, message: error.message, statusCode: error.status || 400 };
    }
  }

  /**
   * Topic: auth.2fa.disable
   */
  @MessagePattern('auth.2fa.disable')
  async handleDisable2fa(@Payload() data: string) {
    try {
      const { userId, token } = typeof data === 'string' ? JSON.parse(data) : data;
      console.log(`📨 [Auth MS] Yêu cầu hủy kích hoạt 2FA cho user: ${userId}`);
      return await this.authService.disableTwoFactor(userId, token);
    } catch (error) {
      console.error(`❌ [Auth MS] Lỗi hủy 2FA:`, error.message);
      return { error: true, message: error.message, statusCode: error.status || 400 };
    }
  }

  /**
   * Topic: auth.2fa.authenticate
   */
  @MessagePattern('auth.2fa.authenticate')
  async handleAuthenticate2fa(@Payload() data: string) {
    try {
      const { tempToken, token } = typeof data === 'string' ? JSON.parse(data) : data;
      console.log(`📨 [Auth MS] Đăng nhập bước 2: Xác thực 2FA OTP`);
      return await this.authService.authenticateTwoFactor(tempToken, token);
    } catch (error) {
      console.error(`❌ [Auth MS] Lỗi xác thực 2FA OTP:`, error.message);
      return { error: true, message: error.message, statusCode: error.status || 401 };
    }
  }

  // =========================================================================
  // EVENT-DRIVEN PATTERN (Dùng kafkaClient.emit())
  // Gateway bắn event bất đồng bộ, không cần chờ phản hồi
  // =========================================================================

  /**
   * Topic: auth.event.logout
   * Ghi log hoạt động khi user đăng xuất (bất đồng bộ)
   */
  @EventPattern('auth.event.logout')
  async handleLogout(@Payload() data: string) {
    const { userId, email } = typeof data === 'string' ? JSON.parse(data) : data;
    console.log(`📝 [Auth MS] User ${email} (${userId}) đã đăng xuất lúc ${new Date().toISOString()}`);
    // TODO: Ghi Audit Log vào database
  }
}
