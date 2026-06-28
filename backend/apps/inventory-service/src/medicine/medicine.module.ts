import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MedicineController } from './medicine.controller';
import { MedicineService } from './medicine.service';
import { Medicine, MedicineSchema } from './schemas/medicine.schema';
import { MedicineBatch, MedicineBatchSchema } from './schemas/medicine-batch.schema';
import { InventoryCheck, InventoryCheckSchema } from './schemas/inventory-check.schema';
import { InventoryTransaction, InventoryTransactionSchema } from '../purchase/schemas/inventory-transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Medicine.name, schema: MedicineSchema },
      { name: MedicineBatch.name, schema: MedicineBatchSchema },
      { name: InventoryCheck.name, schema: InventoryCheckSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
    ]),
  ],
  controllers: [MedicineController],
  providers: [MedicineService],
  exports: [MongooseModule], // Export MongooseModule so other modules can use Medicine/MedicineBatch models
})
export class MedicineModule {}
