import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'inventorytransactions' })
export class InventoryTransaction extends Document {
  @Prop({ type: String, required: true, enum: ['GRN_IMPORT', 'SALE_EXPORT', 'DISPOSE', 'TRANSFER', 'ADJUSTMENT'] })
  type: string; // Loại biến động kho

  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: String })
  medicineName: string; // Denormalized

  @Prop({ type: String })
  batchNo: string;

  @Prop({ type: Number, required: true })
  quantityChange: number; // Dương = nhập, Âm = xuất/hủy

  @Prop({ type: Number, default: 0 })
  stockBefore: number; // Tồn kho trước biến động

  @Prop({ type: Number, default: 0 })
  stockAfter: number; // Tồn kho sau biến động

  @Prop({ type: String })
  referenceId: string; // ID của chứng từ liên quan (GRN ID, PO ID, etc.)

  @Prop({ type: String })
  referenceType: string; // 'GRN', 'PO', 'SALE', etc.

  @Prop({ type: String })
  performedBy: string; // User ID

  @Prop({ type: String })
  notes: string;
}

export const InventoryTransactionSchema = SchemaFactory.createForClass(InventoryTransaction);
