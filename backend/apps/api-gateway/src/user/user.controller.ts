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
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('👤 User Profile')
@Controller('api/users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController implements OnModuleInit {
  constructor(@Inject('USER_SERVICE') private readonly kafkaClient: ClientKafka) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.kafkaClient, [
      'user.edit_profile',
      'user.change_avatar',
    ]);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Chỉnh sửa thông tin hồ sơ' })
  async editProfile(@Request() req, @Body() data: { fullName?: string }) {
    return await sendKafkaMessage(this.kafkaClient, 'user.edit_profile', {
      userId: req.user.sub,
      ...data,
    });
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Cập nhật ảnh đại diện (avatar URL)' })
  async changeAvatar(@Request() req, @Body() data: { avatarUrl: string }) {
    return await sendKafkaMessage(this.kafkaClient, 'user.change_avatar', {
      userId: req.user.sub,
      avatarUrl: data.avatarUrl,
    });
  }
}
