import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Report, ReportSchema } from './schemas/report.schema';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { SalesOrder, SalesOrderSchema } from '../sales/schemas/sales-order.schema';
import { PurchaseOrder, PurchaseOrderSchema } from '../purchase/schemas/purchase-order.schema';
import { Medicine, MedicineSchema } from '../medicine/schemas/medicine.schema';
import { MedicineBatch, MedicineBatchSchema } from '../medicine/schemas/medicine-batch.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
      { name: SalesOrder.name, schema: SalesOrderSchema },
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: Medicine.name, schema: MedicineSchema },
      { name: MedicineBatch.name, schema: MedicineBatchSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
