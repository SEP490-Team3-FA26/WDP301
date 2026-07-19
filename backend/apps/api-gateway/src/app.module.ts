import { Module, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ClientsModule, Transport, ClientKafka } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';

import { SupplierController } from './controllers/supplier.controller';
import { PurchaseRequisitionController } from './controllers/purchase-requisition.controller';
import { PurchaseOrderController } from './controllers/purchase-order.controller';
import { GoodsReceiptController } from './controllers/goods-receipt.controller';
import { InventoryTransactionController } from './controllers/inventory-transaction.controller';
import { PrescriptionController } from './controllers/prescription.controller';
import { SalesController } from './controllers/sales.controller';
import { UserController } from './controllers/user.controller';
import { MedicineController } from './controllers/medicine.controller';
import { AuthController } from './controllers/auth.controller';
import { OrderController } from './controllers/order.controller';
import { VoucherController } from './controllers/voucher.controller';
import { BranchController } from './controllers/branch.controller';
import { PricingGatewayController } from './controllers/pricing.controller';
import { MediaController } from './storage/media.controller';
import { InventoryCheckController } from './controllers/inventory-check.controller';
import { SupplierCreditController } from './controllers/supplier-credit.controller';
import { StockTransferController } from './controllers/stock-transfer.controller';
import { AdminEmployeeController } from './controllers/admin-employee.controller';
import { ReportController } from './controllers/report.controller';
import { QuotaController } from './controllers/quota.controller';

import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { S3StorageService } from './storage/s3-storage.service';
import { ReportService } from './services/report.service';
import { WebsocketModule } from './websocket/websocket.module';
import { NotificationModule } from './notification/notification.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { RedactionService } from './services/redaction.service';
import { AuditFallbackProcessor } from './processors/audit-fallback.processor';

/**
 * Root Module của API Gateway
 * Chỉ chứa các module để routing và caching — không kết nối trực tiếp Database
 */
@Module({
  imports: [
    // Đọc biến môi trường toàn cục
    ConfigModule.forRoot({ isGlobal: true }),

    // MongoDB connection for notifications persistence
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    // Redis Cache (Cache-Aside Strategy)
    CacheModule.register({
      isGlobal: true,
      ttl: 3600,
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
          producer: { allowAutoTopicCreation: true, maxMessageBytes: 10485760 },
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
          producer: { allowAutoTopicCreation: true, maxMessageBytes: 10485760 },
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
          producer: { allowAutoTopicCreation: true, maxMessageBytes: 10485760 },
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
          producer: { allowAutoTopicCreation: true, maxMessageBytes: 10485760 },
        },
      },
      {
        name: 'ORDER_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'api-gw-order-client',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            connectionTimeout: 10000,
            retry: { initialRetryTime: 1000, retries: 10 },
            logLevel: 0,
          },
          consumer: { groupId: 'api-gw-order-group' },
          producer: { allowAutoTopicCreation: true, maxMessageBytes: 10485760 },
        },
      },
    ]),
    WebsocketModule,
    NotificationModule,
  ],
  controllers: [
    SupplierController,
    PurchaseRequisitionController,
    PurchaseOrderController,
    GoodsReceiptController,
    InventoryTransactionController,
    PrescriptionController,
    SalesController,
    UserController,
    MedicineController,
    AuthController,
    OrderController,
    VoucherController,
    BranchController,
    PricingGatewayController,
    MediaController,
    InventoryCheckController,
    SupplierCreditController,
    StockTransferController,
    AdminEmployeeController,
    ReportController,
    QuotaController,
  ],
  providers: [
    JwtAuthGuard,
    JwtStrategy,
    GoogleStrategy,
    S3StorageService,
    ReportService,
  ],
})
export class AppGatewayModule {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    @Inject('SUPPLIER_SERVICE') private readonly supplierClient: ClientKafka,
    @Inject('USER_SERVICE') private readonly userClient: ClientKafka,
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientKafka,
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
  ) {
    // 1. INVENTORY_SERVICE Reply Topics
    const inventoryTopics = [
      'inventory.medicine.list',
      'inventory.medicine.get_by_id',
      'inventory.medicine.update_status',
      'inventory.medicine.get_filters',
      'inventory.medicine.stats',
      'inventory.medicine.expiration_report',
      'inventory.pr.create',
      'inventory.pr.list',
      'inventory.pr.get_by_id',
      'inventory.pr.process_urgent',
      'inventory.po.approve_pay',
      'inventory.po.auto_route',
      'inventory.po.list',
      'inventory.po.get_by_id',
      'inventory.po.reject_delivery',
      'inventory.grn.create',
      'inventory.grn.list',
      'inventory.grn.get_by_id',
      'inventory.transactions.list',
      'inventory.prescription.get_by_code',
      'inventory.prescription.list',
      'inventory.sales.create',
      'inventory.sales.list',
      'inventory.sales.get_by_id',
      'inventory.sales.return',
      'inventory.sales.exchange',
      'inventory.transfer.create',
      'inventory.transfer.receive',
      'inventory.transfer.list',
      'inventory.transfer.get_by_id',
      'inventory.sale.report',
      'quota.get.by.id',
      'quota.get.by.branch',
      'quota.get.summary',
      'quota.get.all',
    ];
    for (const t of inventoryTopics) {
      this.inventoryClient.subscribeToResponseOf(t);
    }

    // 2. SUPPLIER_SERVICE Reply Topics
    const supplierTopics = [
      'supplier.get_all',
      'supplier.create',
    ];
    for (const t of supplierTopics) {
      this.supplierClient.subscribeToResponseOf(t);
    }

    // 3. USER_SERVICE Reply Topics
    const userTopics = [
      'user.edit_profile',
      'user.change_avatar',
      'user.cart.get',
      'user.cart.add',
      'user.cart.update',
      'user.cart.delete',
      'user.cart.clear',
      'user.branch.list',
      'user.branch.create',
      'user.branch.update',
      'user.branch.delete',
      'user.admin.employee.create',
      'user.admin.employee.list',
      'user.admin.employee.get',
      'user.admin.employee.update',
      'user.admin.employee.ban_unban',
    ];
    for (const t of userTopics) {
      this.userClient.subscribeToResponseOf(t);
    }

    // 4. ORDER_SERVICE Reply Topics
    const orderTopics = [
      'orders.create',
      'orders.check',
      'orders.list',
      'orders.my-orders',
    ];
    for (const t of orderTopics) {
      this.orderClient.subscribeToResponseOf(t);
    }

    // 5. KAFKA_SERVICE Reply Topics
    const kafkaTopics = [
      'auth.login',
      'auth.register',
      'auth.google.login',
      'auth.validate.token',
      'auth.get.user.by.id',
      'auth.forgot.password',
      'auth.reset.password',
      'auth.2fa.generate',
      'auth.2fa.enable',
      'auth.2fa.disable',
      'auth.2fa.authenticate',
      'auth.verify.email',
      'auth.resend.verification',
    ];
    for (const t of kafkaTopics) {
      this.kafkaClient.subscribeToResponseOf(t);
    }

    console.log('🏁 [API Gateway] All global Kafka reply topics pre-subscribed successfully.');
  }
}
