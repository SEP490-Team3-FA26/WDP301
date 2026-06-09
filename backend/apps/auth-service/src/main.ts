import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { AuthServiceAppModule } from './app.module';
import { User, UserRole } from './auth/user.schema';

async function bootstrap() {
  /**
   * Auth Service khởi động như một NestJS MICROSERVICE
   * Không lắng nghe HTTP — chỉ lắng nghe message từ Kafka Broker
   */
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
        },
        consumer: {
          // Consumer Group ID — tất cả các pod cùng group sẽ chia nhau xử lý message
          groupId: (process.env.KAFKA_GROUP_ID || 'wdp301-consumers') + '-auth',
        },
      },
    },
  );

  // --- SEED DUMMY ACCOUNTS ---
  const userModel = app.get<Model<User>>(getModelToken(User.name));
  const dummyUsers = [
    { email: 'admin@vinapharmacy.com', role: UserRole.ADMIN, fullName: 'Admin Hệ Thống' },
    { email: 'director@vinapharmacy.com', role: UserRole.HEAD_BRANCH, fullName: 'Giám Đốc Chi Nhánh' },
    { email: 'warehouse@vinapharmacy.com', role: UserRole.WAREHOUSE, fullName: 'Quản Lý Kho' },
    { email: 'manager@vinapharmacy.com', role: UserRole.BRANCH, fullName: 'Quản Lý Cơ Sở' },
    { email: 'pharmacist@vinapharmacy.com', role: UserRole.PHARMACIST, fullName: 'Dược Sĩ Bán Hàng' },
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
  console.log('🚀 Auth Microservice đang lắng nghe Kafka trên localhost:9092');
  console.log('📋 Các Topic đang lắng nghe:');
  console.log('   ✅ auth.login              (Request-Response)');
  console.log('   ✅ auth.register           (Request-Response)');
  console.log('   ✅ auth.validate.token     (Request-Response)');
  console.log('   ✅ auth.get.user.by.id     (Request-Response)');
  console.log('   ✅ auth.event.logout       (Event-Driven)');
}

bootstrap();
