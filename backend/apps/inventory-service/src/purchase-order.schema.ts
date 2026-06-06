import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class PurchaseOrderItem {
  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: Number, required: true, min: 0 })
  unitPrice: number;
}
export const PurchaseOrderItemSchema = SchemaFactory.createForClass(PurchaseOrderItem);

@Schema({ timestamps: true, collection: 'purchaseorders' })
export class PurchaseOrder extends Document {
  @Prop({ type: String, required: true })
  supplierId: string;

  @Prop({ type: [PurchaseOrderItemSchema], required: true })
  items: PurchaseOrderItem[];

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount: number;

  @Prop({ type: String, default: 'PENDING', enum: ['PENDING', 'COMPLETED', 'CANCELLED'] })
  status: string;

  @Prop({ type: String }) // Optional user ID of creator
  createdBy: string;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);
