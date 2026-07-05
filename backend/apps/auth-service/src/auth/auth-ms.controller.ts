import { Controller } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SqsEmailService } from '../email/sqs-email.service';

/**
 * Auth Microservice Controller
 * Lắng nghe Message/Event từ Kafka và xử lý nghiệp vụ xác thực
 */
@Controller()
export class AuthMsController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: SqsEmailService,
  ) {}

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

  /**
   * Topic: auth.verify.email
   */
  @MessagePattern('auth.verify.email')
  async handleVerifyEmail(@Payload() data: string) {
    try {
      const { email, token } = typeof data === 'string' ? JSON.parse(data) : data;
      console.log(`📨 [Auth MS] Nhận yêu cầu xác thực email cho: ${email}`);
      return await this.authService.verifyEmail(email, token);
    } catch (error) {
      console.error(`❌ [Auth MS] Lỗi xác thực email:`, error.message);
      return { error: true, message: error.message, statusCode: error.status || 400 };
    }
  }

  /**
   * Topic: auth.resend.verification
   */
  @MessagePattern('auth.resend.verification')
  async handleResendVerification(@Payload() data: string) {
    try {
      const { email } = typeof data === 'string' ? JSON.parse(data) : data;
      console.log(`📨 [Auth MS] Yêu cầu gửi lại mã kích hoạt cho: ${email}`);
      return await this.authService.resendVerificationOtp(email);
    } catch (error) {
      console.error(`❌ [Auth MS] Lỗi gửi lại mã kích hoạt:`, error.message);
      return { error: true, message: error.message, statusCode: error.status || 400 };
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

  /**
   * Nhận sự kiện gửi hóa đơn điện tử qua email (bất đồng bộ) từ orders-service
   */
  @EventPattern('orders.invoice.send')
  async handleSendInvoice(@Payload() data: any) {
    try {
      const order = typeof data === 'string' ? JSON.parse(data) : data;
      // console.log(`📨 [Auth MS] Nhận sự kiện gửi hóa đơn điện tử cho: ${order.patientEmail} (Đơn hàng: #${order.orderCode})`);

      if (!this.emailService.isEnabled) {
        console.warn(`⚠️ [Auth MS] Email service chưa được cấu hình. Bỏ qua gửi hóa đơn.`);
        return;
      }

      const html = this.generateInvoiceHtml(order);

      await this.emailService.sendEmail({
        to: order.patientEmail,
        subject: `Hóa đơn điện tử ABC Pharmacy - Đơn hàng #${order.orderCode}`,
        html,
      });

      // console.log(`✅ [Auth MS] Đã gửi hóa đơn điện tử đơn hàng #${order.orderCode} tới ${order.patientEmail}`);
    } catch (error) {
      console.error(`❌ [Auth MS] Lỗi gửi hóa đơn điện tử:`, error.message);
    }
  }

  private generateInvoiceHtml(order: any): string {
    const subtotal = order.items.reduce((sum: number, it: any) => sum + it.price * it.quantity, 0);
    const memberDiscount = order.type === 'ONLINE' ? Math.round(subtotal * 0.05) : 0;
    const voucherDiscount = order.voucherDiscount || 0;
    const pointsDiscount = order.pointsDiscount || 0;
    const taxableAmount = Math.max(0, subtotal - memberDiscount - voucherDiscount - pointsDiscount);
    const vat = Math.round(taxableAmount * 0.08);

    return `
      <div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Inter', system-ui, -apple-system, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">HÓA ĐƠN ĐIỆN TỬ</h1>
            <p style="color: #e0f2fe; margin: 4px 0 0 0; font-size: 14px;">Mã hóa đơn: #${order.orderCode}</p>
          </div>
          <div style="padding: 24px 32px;">
            <!-- Customer Information -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; width: 40%;">Khách hàng:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600; width: 60%;">${order.patientName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Số điện thoại:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${order.patientPhone}</td>
              </tr>
              ${order.patientEmail ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Email nhận HD:</td>
                <td style="padding: 6px 0; color: #0f172a;">${order.patientEmail}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Địa chỉ nhận hàng:</td>
                <td style="padding: 6px 0; color: #0f172a;">${order.shippingAddress}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Phương thức thanh toán:</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${order.paymentMethod}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Ngày thanh toán:</td>
                <td style="padding: 6px 0; color: #0f172a;">${new Date(order.createdAt).toLocaleString('vi-VN')}</td>
              </tr>
            </table>

            <!-- Items Table -->
            <h3 style="color: #0f172a; font-size: 16px; margin-top: 0; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Chi tiết sản phẩm</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
              <thead>
                <tr style="border-bottom: 1px solid #e2e8f0; text-align: left;">
                  <th style="padding: 8px 0; color: #64748b; font-weight: 600;">Sản phẩm</th>
                  <th style="padding: 8px 0; color: #64748b; font-weight: 600; text-align: center;">ĐVT</th>
                  <th style="padding: 8px 0; color: #64748b; font-weight: 600; text-align: center;">SL</th>
                  <th style="padding: 8px 0; color: #64748b; font-weight: 600; text-align: right;">Đơn giá</th>
                  <th style="padding: 8px 0; color: #64748b; font-weight: 600; text-align: right;">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                ${order.items.map((it: any) => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px 0; color: #0f172a; font-weight: 500;">${it.name}</td>
                    <td style="padding: 10px 0; color: #475569; text-align: center;">${it.unit || 'Viên'}</td>
                    <td style="padding: 10px 0; color: #0f172a; text-align: center;">${it.quantity}</td>
                    <td style="padding: 10px 0; color: #475569; text-align: right;">${it.price.toLocaleString('vi-VN')}đ</td>
                    <td style="padding: 10px 0; color: #0f172a; text-align: right; font-weight: 600;">${(it.price * it.quantity).toLocaleString('vi-VN')}đ</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <!-- Calculations -->
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 12px; border-top: 2px solid #e2e8f0; padding-top: 12px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Cộng tiền hàng:</td>
                <td style="padding: 6px 0; text-align: right; color: #0f172a; font-weight: 500;">
                  ${subtotal.toLocaleString('vi-VN')}đ
                </td>
              </tr>
              ${order.type === 'ONLINE' ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Chiết khấu thành viên (5%):</td>
                <td style="padding: 6px 0; text-align: right; color: #dc2626;">
                  -${memberDiscount.toLocaleString('vi-VN')}đ
                </td>
              </tr>
              ` : ''}
              ${voucherDiscount ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Mã giảm giá (${order.voucherCode}):</td>
                <td style="padding: 6px 0; text-align: right; color: #dc2626;">-${voucherDiscount.toLocaleString('vi-VN')}đ</td>
              </tr>
              ` : ''}
              ${pointsDiscount ? `
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Quy đổi điểm tích lũy:</td>
                <td style="padding: 6px 0; text-align: right; color: #dc2626;">-${pointsDiscount.toLocaleString('vi-VN')}đ</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Thuế GTGT (8% VAT):</td>
                <td style="padding: 6px 0; text-align: right; color: #0f172a; font-weight: 500;">
                  ${vat.toLocaleString('vi-VN')}đ
                </td>
              </tr>
              <tr style="border-top: 1px solid #e2e8f0; font-size: 16px;">
                <td style="padding: 12px 0; color: #0f172a; font-weight: 700;">TỔNG TIỀN THANH TOÁN:</td>
                <td style="padding: 12px 0; text-align: right; color: #0284c7; font-weight: 800; font-size: 18px;">
                  ${order.totalAmount.toLocaleString('vi-VN')}đ
                </td>
              </tr>
            </table>
            
            ${order.earnedPoints ? `
              <div style="background-color: #f0fdf4; border-radius: 8px; padding: 12px; margin-top: 16px; border: 1px solid #bbf7d0; text-align: center;">
                <p style="margin: 0; color: #166534; font-size: 14px; font-weight: 600;">
                  🎉 Bạn đã tích lũy thêm +${order.earnedPoints} điểm ABC Pharmacy!
                </p>
              </div>
            ` : ''}
          </div>
          <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0; color: #475569; font-size: 14px; font-weight: 600;">Cảm ơn quý khách đã mua sắm tại ABC Pharmacy!</p>
            <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 12px;">Mọi thắc mắc xin vui lòng liên hệ hotline 1900-XXXX</p>
          </div>
        </div>
      </div>
    `;
  }
}
