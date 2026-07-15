import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PurchaseController } from './purchase.controller';
import { PurchaseService } from './purchase.service';
import { PurchaseRequisition, PurchaseRequisitionSchema } from './schemas/purchase-requisition.schema';
import { PurchaseOrder, PurchaseOrderSchema } from './schemas/purchase-order.schema';
import { GoodsReceiptNote, GoodsReceiptNoteSchema } from './schemas/goods-receipt-note.schema';
import { InventoryTransaction, InventoryTransactionSchema } from './schemas/inventory-transaction.schema';
import { StockTransfer, StockTransferSchema } from './schemas/stock-transfer.schema';
import { InspectionRecord, InspectionRecordSchema } from './schemas/inspection-record.schema';
import { MedicineModule } from '../medicine/medicine.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PurchaseRequisition.name, schema: PurchaseRequisitionSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: GoodsReceiptNote.name, schema: GoodsReceiptNoteSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
      { name: StockTransfer.name, schema: StockTransferSchema },
      { name: InspectionRecord.name, schema: InspectionRecordSchema },
    ]),
    MedicineModule, // To access Medicine and MedicineBatch schemas
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
            logLevel: 0,
          },
          consumer: {
            groupId: 'inventory-supplier-group',
          },
        },
      },
    ]),
  ],
  controllers: [PurchaseController],
  providers: [PurchaseService],
})
export class PurchaseModule {}
