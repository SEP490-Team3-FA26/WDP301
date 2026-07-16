import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class InspectionRecordItem {
  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: String, required: true })
  medicineName: string;

  @Prop({ type: Number, required: true, min: 1 })
  expectedQty: number;

  @Prop({ type: Number, default: 0, min: 0 })
  aiCountedQty: number;

  @Prop({ type: Number, default: 0, min: 0 })
  actualQty: number;

  @Prop({ type: String, default: 'MATCH', enum: ['MATCH', 'WARNING', 'MISMATCH'] })
  label: string;

  @Prop({ type: [String], default: [] })
  images: string[];
}
export const InspectionRecordItemSchema = SchemaFactory.createForClass(InspectionRecordItem);

@Schema({ timestamps: true, collection: 'inspectionrecords' })
export class InspectionRecord extends Document {
  @Prop({ type: String, required: true })
  grnId: string; // Ref to GoodsReceiptNote

  @Prop({ type: [InspectionRecordItemSchema], required: true })
  items: InspectionRecordItem[];

  @Prop({ type: String, default: 'PENDING_VERIFICATION', enum: ['PENDING_VERIFICATION', 'WAITING', 'APPROVE', 'REJECT'] })
  status: string;

  @Prop({ type: String }) // User ID of the inspector
  inspectedBy: string;

  @Prop({ type: String }) // User ID of the approver
  approvedBy: string;

  @Prop({ type: String })
  notes: string;
}

export const InspectionRecordSchema = SchemaFactory.createForClass(InspectionRecord);
