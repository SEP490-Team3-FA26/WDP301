import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthGwController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT Module — cần để JwtStrategy có thể verify token
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '3600s') },
      }),
      inject: [ConfigService],
    }),

    // Kết nối tới Kafka Broker để giao tiếp với Auth Microservice
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'api-gateway',
              brokers: (config.get<string>('KAFKA_BROKERS', 'localhost:9092')).split(','),
              connectionTimeout: 10000,
              retry: { initialRetryTime: 1000, retries: 10 },
            },
            consumer: {
              groupId: 'api-gateway-group',
            },
            producer: { allowAutoTopicCreation: true },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [AuthGwController],
  providers: [JwtAuthGuard, JwtStrategy, GoogleStrategy],
  exports: [JwtAuthGuard, JwtStrategy, GoogleStrategy],
})
export class AuthGwModule {}
