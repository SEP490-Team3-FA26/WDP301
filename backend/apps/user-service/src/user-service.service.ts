import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../auth-service/src/auth/user.schema';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
  ) {}

  async editProfile(userId: string, data: { fullName?: string }) {
    this.logger.log(`Editing profile for user ${userId}`);
    
    const user = await this.userModel.findById(userId);
    if (!user) {
      return { error: true, message: 'User not found', statusCode: 404 };
    }

    if (data.fullName) {
      user.fullName = data.fullName;
    }

    await user.save();

    const result = user.toObject();
    delete result.passwordHash;
    return result;
  }

  async changeAvatar(userId: string, avatarUrl: string) {
    this.logger.log(`Changing avatar for user ${userId}`);
    
    const user = await this.userModel.findById(userId);
    if (!user) {
      return { error: true, message: 'User not found', statusCode: 404 };
    }

    user.avatarUrl = avatarUrl;
    await user.save();

    const result = user.toObject();
    delete result.passwordHash;
    return result;
  }
}
