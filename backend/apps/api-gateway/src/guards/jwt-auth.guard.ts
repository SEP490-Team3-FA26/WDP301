import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Guard - Bảo vệ các endpoint yêu cầu đăng nhập
 * Dùng decorator @UseGuards(JwtAuthGuard) trên controller/route cần bảo vệ
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') { }
