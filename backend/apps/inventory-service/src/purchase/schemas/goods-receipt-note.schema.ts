import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class GoodsReceiptNoteItem {
  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: String })
  batchNo?: string;

  @Prop({ type: Date })
  expDate?: Date;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: Number })
  actualQty?: number;

  @Prop({ type: String, default: 'PENDING', enum: ['PENDING', 'VERIFIED'] })
  status: string;

  @Prop({ type: Number, required: true, min: 0 })
  unitPrice: number;
}
export const GoodsReceiptNoteItemSchema = SchemaFactory.createForClass(GoodsReceiptNoteItem);

@Schema({ timestamps: true, collection: 'goodsreceiptnotes' })
export class GoodsReceiptNote extends Document {
  @Prop({ type: String, required: true })
  poId: string; // Ref to PurchaseOrder

  @Prop({ type: [GoodsReceiptNoteItemSchema], required: true })
  items: GoodsReceiptNoteItem[];

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount: number;

  @Prop({ type: String, default: 'DRAFT', enum: ['DRAFT', 'INSPECTING', 'PENDING_APPROVAL', 'COMPLETED', 'CANCELLED'] })
  status: string;

  @Prop({ type: String })
  discrepancyReason?: string;

  @Prop({ type: String }) // Optional user ID of the receiver
  receivedBy: string;

  createdAt: Date;
  updatedAt: Date;
}

export const GoodsReceiptNoteSchema = SchemaFactory.createForClass(GoodsReceiptNote);
