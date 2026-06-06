import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { Medicine, MedicineSchema } from './medicine.schema';
import { MedicineController } from './medicine.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Medicine.name, schema: MedicineSchema }]),
    CacheModule.register({ ttl: 60000, max: 100 }), // 60s cache
  ],
  controllers: [MedicineController],
})
export class MedicineModule {}
