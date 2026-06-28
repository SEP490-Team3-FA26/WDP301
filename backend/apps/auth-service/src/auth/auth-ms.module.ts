import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, UserSchema } from './user.schema';
import { VerificationToken, VerificationTokenSchema } from './verification-token.schema';
import { AuthService } from './auth.service';
import { AuthMsController } from './auth-ms.controller';
import { SqsEmailService } from '../email/sqs-email.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: VerificationToken.name, schema: VerificationTokenSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '3600s') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthMsController],
  providers: [AuthService, SqsEmailService],
  exports: [AuthService],
})
export class AuthMsModule {}
