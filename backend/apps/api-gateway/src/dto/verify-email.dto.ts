import { IsEmail, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email của tài khoản cần xác thực' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Mã OTP 6 số nhận từ Email' })
  @IsString()
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 ký tự số' })
  token: string;
}

export class ResendVerificationDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email của tài khoản cần gửi lại mã xác thực' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}
