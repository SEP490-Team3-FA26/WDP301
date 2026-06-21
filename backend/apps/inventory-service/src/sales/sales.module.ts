import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesOrder, SalesOrderSchema } from './schemas/sales-order.schema';
import { Prescription, PrescriptionSchema } from './schemas/prescription.schema';
import { MedicineModule } from '../medicine/medicine.module';
import { InventoryTransaction, InventoryTransactionSchema } from '../purchase/schemas/inventory-transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SalesOrder.name, schema: SalesOrderSchema },
      { name: Prescription.name, schema: PrescriptionSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
    ]),
    MedicineModule, // To access Medicine and MedicineBatch schemas
  ],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
