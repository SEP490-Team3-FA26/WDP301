import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryServiceController } from './inventory-service.controller';
import { InventoryServiceService } from './inventory-service.service';
import { ProductModule } from './product/product.module';
import { PurchaseOrder, PurchaseOrderSchema } from './purchase-order.schema';
import { MedicineSchema } from '../../api-gateway/src/medicine/medicine.schema';
import { GoodsReceiptNote, GoodsReceiptNoteSchema } from './goods-receipt-note.schema';
import { MedicineBatch, MedicineBatchSchema } from './medicine-batch.schema';

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
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: 'Medicine', schema: MedicineSchema },
      { name: GoodsReceiptNote.name, schema: GoodsReceiptNoteSchema },
      { name: MedicineBatch.name, schema: MedicineBatchSchema },
    ]),
    ClientsModule.register([
      {
        name: 'SUPPLIER_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'inventory-supplier-client',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            connectionTimeout: 10000,
            retry: { initialRetryTime: 1000, retries: 10 },
          },
          consumer: {
            groupId: 'inventory-supplier-group',
          },
          producer: { allowAutoTopicCreation: true },
        },
      },
    ]),
    ProductModule,
  ],
  controllers: [InventoryServiceController],
  providers: [InventoryServiceService],
})
export class InventoryServiceModule {}
