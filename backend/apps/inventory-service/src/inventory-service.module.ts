import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MedicineModule } from './medicine/medicine.module';
import { PurchaseModule } from './purchase/purchase.module';
import { SalesModule } from './sales/sales.module';
import { PricingModule } from './pricing/pricing.module';
import { ReportsModule } from './reports/reports.module';
import { QuotaModule } from './quota/quota.module';

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
    MedicineModule,
    PurchaseModule,
    SalesModule,
    PricingModule,
    ReportsModule,
    QuotaModule,
  ],
})
export class InventoryServiceModule { }
