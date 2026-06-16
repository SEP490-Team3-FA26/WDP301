import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { SupplierController } from './controllers/supplier.controller';
import { PurchaseOrderController } from './controllers/purchase-order.controller';
import { GoodsReceiptController } from './controllers/goods-receipt.controller';
import { PrescriptionController } from './controllers/prescription.controller';
import { SalesController } from './controllers/sales.controller';
import { UserController } from './controllers/user.controller';
import { MedicineController } from './controllers/medicine.controller';
import { AuthController } from './controllers/auth.controller';
import { BranchController } from './controllers/branch.controller';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

/**
 * Root Module của API Gateway
 * Chỉ chứa các module để routing và caching — không kết nối trực tiếp Database
 */
@Module({
  imports: [
    // Đọc biến môi trường toàn cục
    ConfigModule.forRoot({ isGlobal: true }),

    // Redis Cache (Cache-Aside Strategy)
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        store: 'memory', // Dùng memory store cho dev; thay bằng redis store cho production
        ttl: 3600,       // Mặc định TTL 1 giờ
      }),
      inject: [ConfigService],
    }),

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

    ClientsModule.register([
      {
        name: 'SUPPLIER_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'api-gw-supplier-client',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            connectionTimeout: 10000,
            retry: { initialRetryTime: 1000, retries: 10 },
            logLevel: 0,
          },
          consumer: { groupId: 'api-gw-supplier-group' },
          producer: { allowAutoTopicCreation: true },
        },
      },
      {
        name: 'INVENTORY_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'api-gw-inventory-client',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            connectionTimeout: 10000,
            retry: { initialRetryTime: 1000, retries: 10 },
            logLevel: 0,
          },
          consumer: { groupId: 'api-gw-inventory-group' },
          producer: { allowAutoTopicCreation: true },
        },
      },
      {
        name: 'USER_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'api-gateway-user-client',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            connectionTimeout: 10000,
            retry: { initialRetryTime: 1000, retries: 10 },
            logLevel: 0,
          },
          consumer: {
            groupId: 'api-gateway-user-group',
          },
          producer: { allowAutoTopicCreation: true },
        },
      },
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'api-gateway',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            connectionTimeout: 10000,
            retry: { initialRetryTime: 1000, retries: 10 },
            logLevel: 0,
          },
          consumer: {
            groupId: 'api-gateway-group',
          },
          producer: { allowAutoTopicCreation: true },
        },
      },
    ]),
  ],
  controllers: [
    SupplierController, 
    PurchaseOrderController, 
    GoodsReceiptController, 
    PrescriptionController, 
    SalesController,
    UserController,
    MedicineController,
    AuthController,
    BranchController,
  ],
  providers: [
    JwtAuthGuard,
    JwtStrategy,
    GoogleStrategy,
  ],
})
export class AppGatewayModule {}
