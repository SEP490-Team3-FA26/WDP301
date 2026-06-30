import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { AuthServiceAppModule } from './app.module';
import { User, UserRole } from './auth/user.schema';

async function bootstrap() {
  process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';
  let retries = 10;
  while (retries > 0) {
    try {
      console.log('🔄 Đang kết nối tới Kafka...');
      const app = await NestFactory.createMicroservice<MicroserviceOptions>(
        AuthServiceAppModule,
        {
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'auth-service',
              brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
              connectionTimeout: 10000,
              retry: { initialRetryTime: 1000, retries: 10 },
              logLevel: 0,
            },
            consumer: {
              // Consumer Group ID — tất cả các pod cùng group sẽ chia nhau xử lý message
              groupId: (process.env.KAFKA_GROUP_ID || 'wdp301-consumers') + '-auth',
            },
            subscribe: {
              allowAutoTopicCreation: true,
            },
          } as any,
          logger: ['error', 'warn'],
        },
      );

      // --- SEED DUMMY ACCOUNTS ---
      const userModel = app.get<Model<User>>(getModelToken(User.name));
      const dummyUsers = [
        { email: 'admin@ABC pharmacy.com', role: UserRole.ADMIN, fullName: 'Admin Hệ Thống' },
        { email: 'director@ABC pharmacy.com', role: UserRole.HEAD_BRANCH, fullName: 'Giám Đốc Chi Nhánh' },
        { email: 'warehouse@ABC pharmacy.com', role: UserRole.WAREHOUSE, fullName: 'Quản Lý Kho' },
        { email: 'manager@ABC pharmacy.com', role: UserRole.BRANCH, fullName: 'Quản Lý Cơ Sở' },
        { email: 'pharmacist@ABC pharmacy.com', role: UserRole.PHARMACIST, fullName: 'Dược Sĩ Bán Hàng' },
        { email: 'user@ABC pharmacy.com', role: UserRole.USER, fullName: 'Khách Hàng' },
      ];

      const passwordHash = await bcrypt.hash('123456', 10);

      for (const dummy of dummyUsers) {
        const exists = await userModel.findOne({ email: dummy.email });
        if (!exists) {
          await userModel.create({
            ...dummy,
            passwordHash,
            isEmailVerified: true,
          });
          console.log(`🌱 [Seed] Đã tạo tài khoản test: ${dummy.email} / Mật khẩu: 123456`);
        }
      }
      // ---------------------------

      await app.listen();
      console.log('🚀 Auth Microservice khởi động thành công!');
      break;
    } catch (error) {
      console.log('🔄 Kafka chưa sẵn sàng, đang thử lại sau 5s...');
      retries--;
      if (retries === 0) throw error;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

bootstrap();
