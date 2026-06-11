import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './user.schema';
import { VerificationToken, TokenType } from './verification-token.schema';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(VerificationToken.name)
    private readonly tokenModel: Model<VerificationToken>,
    private readonly jwtService: JwtService,
  ) {}

  // ============================================================
  // ĐĂNG KÝ - Tạo tài khoản mới
  // ============================================================
  async register(dto: RegisterDto): Promise<{ message: string; userId: string }> {
    const existing = await this.userModel.findOne({ email: dto.email });
    if (existing) {
      throw new ConflictException(`Email "${dto.email}" đã được đăng ký!`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const newUser = new this.userModel({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash,
      role: dto.role ?? UserRole.PHARMACIST,
    });

    const savedUser = await newUser.save();
    return {
      message: 'Đăng ký tài khoản thành công!',
      userId: savedUser._id.toString(),
    };
  }

  // ============================================================
  // ĐĂNG NHẬP - Xác thực và cấp JWT Token
  // ============================================================
  async login(dto: LoginDto): Promise<{
    access_token: string;
    user: { id: string; email: string; fullName: string; role: string };
  }> {
    const userFromDb = await this.userModel.findOne({ email: dto.email });

    if (!userFromDb) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác!');
    }

    if (!userFromDb.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa!');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, userFromDb.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác!');
    }

    const payload = {
      sub: userFromDb._id.toString(),
      email: userFromDb.email,
      role: userFromDb.role,
      fullName: userFromDb.fullName,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: userFromDb._id.toString(),
        email: userFromDb.email,
        fullName: userFromDb.fullName,
        role: userFromDb.role,
      },
    };
  }

  // ============================================================
  // GOOGLE LOGIN
  // ============================================================
  async googleLogin(profile: any): Promise<{
    access_token: string;
    user: { id: string; email: string; fullName: string; role: string };
  }> {
    const { email, fullName } = profile;

    let userFromDb = await this.userModel.findOne({ email });

    // Nếu chưa tồn tại, tự động đăng ký mới vào MongoDB
    if (!userFromDb) {
      const passwordHash = await bcrypt.hash(Math.random().toString(36).slice(-10), 12); // Random password cho Google users
      userFromDb = new this.userModel({
        fullName,
        email,
        passwordHash,
        role: UserRole.USER,
        isActive: true,
      });
      await userFromDb.save();
    }

    if (!userFromDb.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa!');
    }

    // Cấp JWT Token
    const payload = {
      sub: userFromDb._id.toString(),
      email: userFromDb.email,
      role: userFromDb.role,
      fullName: userFromDb.fullName,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: userFromDb._id.toString(),
        email: userFromDb.email,
        fullName: userFromDb.fullName,
        role: userFromDb.role,
      },
    };
  }

  // ============================================================
  // XÁC MINH TOKEN - Dùng trong JWT Guard
  // ============================================================
  async validateToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token);
      if (!payload) throw new UnauthorizedException('Token không hợp lệ!');
      return payload;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn!');
    }
  }

  // ============================================================
  // QUÊN MẬT KHẨU - Gửi mã xác nhận qua Email
  // ============================================================
  async generateAndSendResetToken(email: string): Promise<{ message: string }> {
    const userExists = await this.userModel.findOne({ email });

    if (!userExists) {
      throw new NotFoundException(`Không tìm thấy tài khoản với email ${email}`);
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    await this.tokenModel.deleteMany({ userId: email, type: TokenType.PASSWORD_RESET });

    await this.tokenModel.create({
      token: otp,
      type: TokenType.PASSWORD_RESET,
      expiresAt,
      userId: email,
      isUsed: false,
    });

    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: `"ABC Pharmacy" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Mã xác nhận khôi phục mật khẩu',
          html: `
            <div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
                <div style="background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); padding: 32px 24px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">VinaPharmacy</h1>
                </div>
                <div style="padding: 40px 32px;">
                  <h2 style="color: #0f172a; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 16px; text-align: center;">Khôi phục mật khẩu</h2>
                  <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 32px; text-align: center;">
                    Xin chào!<br>
                    Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Đây là mã xác nhận (OTP) của bạn:
                  </p>
                  <div style="text-align: center; margin-bottom: 32px;">
                    <div style="display: inline-block; padding: 4px; border-radius: 16px; background: linear-gradient(135deg, #e0f2fe 0%, #dbeafe 100%);">
                      <span style="display: block; letter-spacing: 8px; color: #1e40af; font-size: 40px; font-weight: 900; padding: 16px 32px; background-color: #ffffff; border-radius: 12px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
                        ${otp}
                      </span>
                    </div>
                  </div>
                  <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 4px; margin-bottom: 32px;">
                    <p style="color: #b45309; font-size: 14px; margin: 0; text-align: center;">
                      <span style="margin-right: 4px; font-size: 16px;">⏳</span> Mã xác nhận sẽ hết hạn sau <strong>5 phút</strong>.
                    </p>
                  </div>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin-bottom: 24px;">
                  <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
                    Nếu bạn không yêu cầu đổi mật khẩu, hãy bỏ qua email này.<br>Tài khoản của bạn vẫn an toàn.<br><br>
                    Trân trọng,<br>
                    <strong style="color: #0f172a;">Đội ngũ VinaPharmacy</strong>
                  </p>
                </div>
              </div>
            </div>
          `,
        });
        console.log(`✉️ [Email] Đã gửi OTP đến ${email}`);
      } else {
        console.warn(`⚠️ [MOCK EMAIL] Gửi email đến ${email}. Mã OTP: ${otp}`);
      }
    } catch (error: any) {
      console.error(`❌ [Email Error] Lỗi gửi mail: ${error.message}`);
    }

    return { message: 'Mã xác nhận đã được gửi đến email của bạn!' };
  }

  // ============================================================
  // ĐẶT LẠI MẬT KHẨU
  // ============================================================
  async resetPassword(email: string, token: string, newPassword: string): Promise<{ message: string }> {
    const resetToken = await this.tokenModel.findOne({
      userId: email,
      token: token,
      type: TokenType.PASSWORD_RESET,
      isUsed: false,
    });

    if (!resetToken) {
      throw new UnauthorizedException('Mã xác nhận không đúng hoặc không tồn tại!');
    }

    if (new Date() > resetToken.expiresAt) {
      throw new UnauthorizedException('Mã xác nhận đã hết hạn!');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    const mongoUser = await this.userModel.findOne({ email });
    if (!mongoUser) {
      throw new NotFoundException('Không tìm thấy tài khoản để đổi mật khẩu');
    }
    mongoUser.passwordHash = passwordHash;
    await mongoUser.save();

    resetToken.isUsed = true;
    await resetToken.save();

    return { message: 'Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ.' };
  }

  // ============================================================
  // LẤY THÔNG TIN USER THEO ID
  // ============================================================
  async getUserById(id: string): Promise<any> {
    const user = await this.userModel.findById(id).select('-passwordHash').exec();
    if (!user) {
      throw new NotFoundException(`Không tìm thấy tài khoản!`);
    }
    return user.toObject();
  }
}
