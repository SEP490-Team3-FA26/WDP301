import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class InventoryCheckItem {
  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: String, required: true })
  medicineName: string;

  @Prop({ type: String, required: true })
  batchNo: string;

  @Prop({ type: Number, required: true })
  systemStock: number; // Tồn kho hệ thống khi kiểm kê

  @Prop({ type: Number, required: true })
  actualStock: number; // Tồn kho thực tế đếm được

  @Prop({ type: Number, required: true })
  difference: number; // Chênh lệch (actualStock - systemStock)

  @Prop({ type: String })
  reason: string; // Lý do thừa/thiếu
}
export const InventoryCheckItemSchema = SchemaFactory.createForClass(InventoryCheckItem);

@Schema({ timestamps: true, collection: 'inventorychecks' })
export class InventoryCheck extends Document {
  @Prop({ type: String, required: true, unique: true })
  checkCode: string; // Ví dụ: IC-20260621-001

  @Prop({ type: String, required: true, default: 'DRAFT', enum: ['DRAFT', 'COMPLETED'] })
  status: string;

  @Prop({ type: [InventoryCheckItemSchema], required: true })
  items: InventoryCheckItem[];

  @Prop({ type: String })
  performedBy: string;

  @Prop({ type: String })
  notes: string;
}

export const InventoryCheckSchema = SchemaFactory.createForClass(InventoryCheck);
