import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Request,
  Inject,
  OnModuleInit,
  HttpException,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('👤 User Profile')
@Controller('api/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController implements OnModuleInit {
  constructor(@Inject('USER_SERVICE') private readonly kafkaClient: ClientKafka) {}

  async onModuleInit() {
    this.kafkaClient.subscribeToResponseOf('user.edit_profile');
    this.kafkaClient.subscribeToResponseOf('user.change_avatar');
    // auth-service still handles user.get_user_by_id in our architecture for now, but we can call it here or keep using /api/auth/profile
    await this.kafkaClient.connect();
  }

  @Put('profile')
  @ApiOperation({ summary: 'Chỉnh sửa thông tin hồ sơ' })
  async editProfile(@Request() req, @Body() data: { fullName?: string }) {
    const result: any = await lastValueFrom(
      this.kafkaClient.send('user.edit_profile', {
        userId: req.user.sub,
        ...data,
      }),
    );
    if (result?.error) throw new HttpException(result.message, result.statusCode);
    return result;
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Cập nhật ảnh đại diện (avatar URL)' })
  async changeAvatar(@Request() req, @Body() data: { avatarUrl: string }) {
    const result: any = await lastValueFrom(
      this.kafkaClient.send('user.change_avatar', {
        userId: req.user.sub,
        avatarUrl: data.avatarUrl,
      }),
    );
    if (result?.error) throw new HttpException(result.message, result.statusCode);
    return result;
  }
}
