import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthGwModule } from './auth/auth-gw.module';
import { UserModule } from './user/user.module';

/**
 * Root Module của API Gateway
 * Chỉ chứa các module để routing và caching — không kết nối trực tiếp Database
 */
@Module({
  imports: [
    // Đọc biến môi trường toàn cục
    ConfigModule.forRoot({ isGlobal: true }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    // Redis Cache (Cache-Aside Strategy)
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        store: 'memory', // Dùng memory store cho dev; thay bằng redis store cho production
        ttl: 3600,       // Mặc định TTL 1 giờ
        // Để dùng Redis thực sự, cài thêm: npm install cache-manager-ioredis-yet
        // và thêm: store: redisStore, host: config.get('REDIS_HOST'), port: config.get('REDIS_PORT')
      }),
      inject: [ConfigService],
    }),

    // --- Các Modules nghiệp vụ của API Gateway ---
    AuthGwModule,
    UserModule,
  ],
})
export class AppGatewayModule {}
