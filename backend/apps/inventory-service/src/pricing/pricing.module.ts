import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { BranchPriceList, BranchPriceListSchema } from './schemas/branch-price-list.schema';
import { MedicineModule } from '../medicine/medicine.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BranchPriceList.name, schema: BranchPriceListSchema },
    ]),
    MedicineModule, // To access Medicine schema for price fallback & validation
  ],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService], // Export so SalesModule can inject PricingService
})
export class PricingModule {}
