import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class StockTransferItem {
  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: String, default: '' })
  medicineName: string;

  @Prop({ type: String, required: true })
  batchNo: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: String, default: 'Hộp' })
  unit: string;
}
export const StockTransferItemSchema = SchemaFactory.createForClass(StockTransferItem);

@Schema({ timestamps: true, collection: 'stocktransfers' })
export class StockTransfer extends Document {
  @Prop({ type: String, required: true, unique: true })
  transferCode: string; // ST-YYYYMMDD-XXXX

  @Prop({ type: String, required: true })
  prId: string; // ID của PurchaseRequisition gốc

  @Prop({ type: String, required: true })
  prCode: string; // Mã PR để dễ hiển thị

  @Prop({ type: String, default: 'CENTRAL_WH' })
  fromBranchId: string; // Nơi xuất phát (thường là CENTRAL_WH)

  @Prop({ type: String, required: true })
  toBranchId: string; // ID chi nhánh nhận

  @Prop({ type: String, required: true })
  toBranchName: string; // Tên chi nhánh nhận

  @Prop({ type: [StockTransferItemSchema], required: true })
  items: StockTransferItem[];

  @Prop({
    type: String,
    default: 'SHIPPING',
    enum: ['SHIPPING', 'DELIVERED', 'COMPLETED', 'OUT_OF_STOCK', 'REJECTED'],
  })
  status: string;

  @Prop({ type: String })
  shippedBy: string; // User ID của người xuất kho tổng

  @Prop({ type: String })
  receivedBy: string; // User ID của Branch Manager nhận hàng

  @Prop({ type: Date })
  shippedAt: Date;

  @Prop({ type: Date })
  receivedAt: Date;

  @Prop({ type: String })
  notes: string; // Ghi chú thêm khi xuất kho

  @Prop({ type: [String], default: [] })
  outOfStockMedicineIds: string[]; // ID các thuốc bị báo hết kho
}

export const StockTransferSchema = SchemaFactory.createForClass(StockTransfer);
