import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SupplierServiceController } from './supplier-service.controller';
import { SupplierServiceService } from './supplier-service.service';
import { Supplier, SupplierSchema } from './supplier.schema';
import { SupplierCreditController } from './credit/supplier-credit.controller';
import { SupplierCreditService } from './credit/supplier-credit.service';
import { SupplierCreditTransaction, SupplierCreditTransactionSchema } from './schemas/supplier-credit-transaction.schema';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: Supplier.name, schema: SupplierSchema },
      { name: SupplierCreditTransaction.name, schema: SupplierCreditTransactionSchema },
    ]),
  ],
  controllers: [SupplierServiceController, SupplierCreditController],
  providers: [SupplierServiceService, SupplierCreditService],
})
export class SupplierServiceModule {}

