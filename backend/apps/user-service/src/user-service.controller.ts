import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user-service.service';

@Controller()
export class UserServiceController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern('user.edit_profile')
  handleEditProfile(@Payload() data: { userId: string; fullName?: string }) {
    return this.userService.editProfile(data.userId, data);
  }

  @MessagePattern('user.change_avatar')
  handleChangeAvatar(@Payload() data: { userId: string; avatarUrl: string }) {
    return this.userService.changeAvatar(data.userId, data.avatarUrl);
  }
}
