import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class SalesOrderBatchItem {
  @Prop({ type: String, required: true })
  batchNo: string;

  @Prop({ type: Number, required: true })
  quantity: number;
}
export const SalesOrderBatchItemSchema = SchemaFactory.createForClass(SalesOrderBatchItem);

@Schema()
export class SalesOrderItem {
  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: Number, required: true, min: 0 })
  price: number;

  @Prop({ type: String, required: true })
  unit: string;

  @Prop({ type: [SalesOrderBatchItemSchema], required: true })
  batches: SalesOrderBatchItem[];

  @Prop({ type: Number, default: 0 })
  returnedQuantity: number;
}
export const SalesOrderItemSchema = SchemaFactory.createForClass(SalesOrderItem);

@Schema({ timestamps: true, collection: 'salesorders' })
export class SalesOrder extends Document {
  @Prop({ type: String })
  prescriptionId: string; // Ref to prescriptions._id (optional)

  @Prop({ type: String })
  prescriptionCode: string; // Ref to prescriptions.prescriptionCode (optional)

  @Prop({ type: [SalesOrderItemSchema], required: true })
  items: SalesOrderItem[];

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount: number;

  @Prop({ type: String, required: true, default: 'CASH', enum: ['CASH', 'CARD', 'QR_PAY'] })
  paymentMethod: string;

  @Prop({ type: String, required: true, default: 'RETAIL', enum: ['RETAIL', 'PRESCRIPTION', 'WHOLESALE'] })
  type: string;

  @Prop({ type: String })
  patientName: string;

  @Prop({ type: String })
  patientPhone: string;

  @Prop({ type: String })
  soldBy: string;

  @Prop({ type: [Object], default: [] })
  returns: any[];

  @Prop({ type: [Object], default: [] })
  exchanges: any[];
}

export const SalesOrderSchema = SchemaFactory.createForClass(SalesOrder);
