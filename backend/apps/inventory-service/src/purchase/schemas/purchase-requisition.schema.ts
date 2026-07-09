import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class PurchaseRequisitionItem {
  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: String })
  medicineName: string; // Denormalized for quick display

  @Prop({ type: Number, required: true, min: 1 })
  requestedQuantity: number;

  @Prop({ type: String })
  unit: string; // Hộp, Viên, Chai, etc.
}
export const PurchaseRequisitionItemSchema = SchemaFactory.createForClass(PurchaseRequisitionItem);

@Schema({ timestamps: true, collection: 'purchaserequisitions' })
export class PurchaseRequisition extends Document {
  @Prop({ type: String, required: true, unique: true })
  prCode: string; // Auto-generated PR-YYYYMMDD-XXXX

  @Prop({ type: String, required: true })
  branchId: string; // ID chi nhánh tạo yêu cầu

  @Prop({ type: String, required: true })
  branchName: string; // Tên chi nhánh (denormalized)

  @Prop({ type: [PurchaseRequisitionItemSchema], required: true })
  items: PurchaseRequisitionItem[];

  @Prop({ type: String })
  reason: string; // Lý do yêu cầu (VD: Chuẩn bị vào mùa dịch cúm)

  @Prop({ type: String })
  notes: string; // Ghi chú thêm

  @Prop({ type: Boolean, default: false })
  isUrgent: boolean; // Flag hỏa tốc

  @Prop({
    type: String,
    default: 'SUBMITTED',
    enum: ['DRAFT', 'SUBMITTED', 'WAREHOUSE_SUBMITTED', 'CONSOLIDATED', 'URGENT_PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
  })
  status: string;

  @Prop({ type: String })
  createdBy: string; // User ID của Branch Manager

  @Prop({ type: String })
  consolidatedBy: string; // User ID của Warehouse Manager đã gom đơn

  @Prop({ type: String })
  approvedBy: string; // User ID của HQ Manager đã duyệt

  @Prop({ type: String })
  rejectionReason: string; // Lý do từ chối (nếu bị reject)

  @Prop({ type: Date })
  approvedAt: Date;

  @Prop({ type: String })
  linkedPoId: string; // Sau khi duyệt, link đến PO được tạo

  @Prop({ type: String })
  warehouseSubmittedBy: string; // User ID của Thủ kho gửi yêu cầu một Hạng

  @Prop({ type: Date })
  warehouseSubmittedAt: Date;
}

export const PurchaseRequisitionSchema = SchemaFactory.createForClass(PurchaseRequisition);
