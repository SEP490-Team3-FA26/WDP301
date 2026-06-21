import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class PurchaseOrderItem {
  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: String, default: '' })
  medicineName: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: Number, default: 0 })
  receivedQuantity: number; // Số lượng đã nhận thực tế (dùng cho Partial Delivery)

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

  @Prop({
    type: String,
    default: 'PENDING_APPROVAL',
    enum: ['PENDING_APPROVAL', 'SHIPPING', 'PARTIAL_RECEIVED', 'COMPLETED', 'RETURNED', 'CANCELLED'],
  })
  status: string;

  @Prop({ type: String }) // Optional user ID of creator
  createdBy: string;

  @Prop({ type: String }) // Liên kết ngược lại PR gốc (nếu PO được tạo từ PR đã duyệt)
  linkedPrId: string;

  @Prop({ type: Number, default: 0 }) // Pipeline/Incoming Stock — hàng dự kiến về
  expectedIncoming: number;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);
