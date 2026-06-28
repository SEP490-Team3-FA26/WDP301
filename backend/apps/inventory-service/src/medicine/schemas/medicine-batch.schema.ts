import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'medicinebatches' })
export class MedicineBatch extends Document {
  @Prop({ type: String, required: true, index: true })
  medicineId: string;

  @Prop({ type: String, default: 'CENTRAL_WH', index: true })
  branchId: string;

  @Prop({ type: String, required: true })
  batchNo: string;

  @Prop({ type: Date, required: true })
  expDate: Date;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  stock: number;

  @Prop({ type: String, default: 'ACTIVE', enum: ['ACTIVE', 'EXPIRED'] })
  status: string;
}

export const MedicineBatchSchema = SchemaFactory.createForClass(MedicineBatch);

// đánh chỉ mục - tăng tốc độ read database
MedicineBatchSchema.index({ branchId: 1, status: 1, stock: 1, medicineId: 1 });

