import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../auth-service/src/auth/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async editProfile(userId: string, data: { fullName?: string }) {
    this.logger.log(`Editing profile for user ${userId}`);
    
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return { error: true, message: 'User not found', statusCode: 404 };
    }

    if (data.fullName) {
      user.fullName = data.fullName;
    }

    await this.userRepository.save(user);

    // Return user without password
    const { passwordHash, ...result } = user;
    return result;
  }

  async changeAvatar(userId: string, avatarUrl: string) {
    this.logger.log(`Changing avatar for user ${userId}`);
    
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      return { error: true, message: 'User not found', statusCode: 404 };
    }

    user.avatarUrl = avatarUrl;
    await this.userRepository.save(user);

    const { passwordHash, ...result } = user;
    return result;
  }
}
