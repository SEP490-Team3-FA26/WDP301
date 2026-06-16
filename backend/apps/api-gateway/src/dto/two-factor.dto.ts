import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyTwoFactorDto {
  @ApiProperty({ example: '123456', description: 'Mã OTP 6 số từ ứng dụng Authenticator' })
  @IsString()
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 ký tự số' })
  token: string;
}

export class AuthenticateTwoFactorDto {
  @ApiProperty({ example: 'eyJhbGciOi...', description: 'Token xác thực tạm thời từ đăng nhập bước 1' })
  @IsString()
  tempToken: string;

  @ApiProperty({ example: '123456', description: 'Mã OTP 6 số từ ứng dụng Authenticator' })
  @IsString()
  @Length(6, 6, { message: 'Mã OTP phải có đúng 6 ký tự số' })
  token: string;
}
