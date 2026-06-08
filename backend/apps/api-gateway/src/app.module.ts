import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthGwModule } from './auth/auth-gw.module';
import { UserModule } from './user/user.module';
import { MedicineModule } from './medicine/medicine.module';

import { SupplierController } from './supplier.controller';
import { PurchaseOrderController } from './purchase-order.controller';
import { GoodsReceiptController } from './goods-receipt.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

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
      }),
      inject: [ConfigService],
    }),

    ClientsModule.register([
      {
        name: 'SUPPLIER_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: { clientId: 'api-gw-supplier-client', brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',') },
          consumer: { groupId: 'api-gw-supplier-group' },
        },
      },
      {
        name: 'INVENTORY_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: { clientId: 'api-gw-inventory-client', brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',') },
          consumer: { groupId: 'api-gw-inventory-group' },
        },
      },
    ]),

    // --- Các Modules nghiệp vụ của API Gateway ---
    AuthGwModule,
    UserModule,
    MedicineModule,
  ],
  controllers: [SupplierController, PurchaseOrderController, GoodsReceiptController],
})
export class AppGatewayModule {}
