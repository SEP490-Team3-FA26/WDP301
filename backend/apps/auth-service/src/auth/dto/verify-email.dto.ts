import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Mã xác nhận không được để trống' })
  @Length(6, 6, { message: 'Mã xác nhận phải gồm 6 ký tự' })
  token: string;
}
