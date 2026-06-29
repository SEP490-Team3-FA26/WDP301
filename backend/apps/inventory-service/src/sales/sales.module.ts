import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesOrder, SalesOrderSchema } from './schemas/sales-order.schema';
import { Prescription, PrescriptionSchema } from './schemas/prescription.schema';
import { MedicineModule } from '../medicine/medicine.module';
import { PricingModule } from '../pricing/pricing.module';
import { InventoryTransaction, InventoryTransactionSchema } from '../purchase/schemas/inventory-transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SalesOrder.name, schema: SalesOrderSchema },
      { name: Prescription.name, schema: PrescriptionSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
    ]),
    MedicineModule, // To access Medicine and MedicineBatch schemas
    PricingModule,  // To access PricingService for branch price resolution
    ClientsModule.register([
      {
        name: 'KAFKA_CLIENT',
        transport: Transport.KAFKA,
        options: {
          client: {
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
          },
          producer: { allowAutoTopicCreation: true },
        },
      },
    ]),
  ],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
