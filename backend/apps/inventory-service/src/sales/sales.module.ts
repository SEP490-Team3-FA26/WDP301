import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
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
        name: 'USER_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'inventory-user-client',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            connectionTimeout: 10000,
            retry: { initialRetryTime: 1000, retries: 10 },
            logLevel: 0,
          },
          consumer: {
            groupId: 'inventory-user-group',
          },
        },
      },
    ]),
  ],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
