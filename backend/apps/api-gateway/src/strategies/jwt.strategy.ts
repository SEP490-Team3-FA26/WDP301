import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JWT Strategy - Cấu hình cách đọc và xác minh JWT token
 * Token được đọc từ Authorization header: "Bearer <token>"
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      // Cách trích xuất token từ request (từ Authorization: Bearer header)
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Từ chối token đã hết hạn
      ignoreExpiration: false,
      // Secret key để xác minh chữ ký của token
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Sau khi passport xác minh token hợp lệ, method này được gọi
   * Giá trị return sẽ được gán vào req.user trong controller
   */
  async validate(payload: { sub: string; email: string; role: string; fullName: string }) {
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
    };
  }
}
