import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'nguyenvana@wdp301.com', description: 'Email tài khoản cần khôi phục' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}
