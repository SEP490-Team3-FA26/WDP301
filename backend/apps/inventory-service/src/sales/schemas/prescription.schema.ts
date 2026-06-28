import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class PrescriptionItem {
  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: Number, required: true })
  quantity: number;

  @Prop({ type: String, required: true })
  dosage: string;
}

export const PrescriptionItemSchema = SchemaFactory.createForClass(PrescriptionItem);

@Schema({ timestamps: true, collection: 'prescriptions' })
export class Prescription extends Document {
  @Prop({ required: true, unique: true })
  prescriptionCode: string;

  @Prop({ required: true })
  patientName: string;

  @Prop({ required: true })
  patientAge: number;

  @Prop({ required: true })
  patientGender: string;

  @Prop({ required: true })
  patientPhone: string;

  @Prop({ required: true })
  doctorName: string;

  @Prop({ required: true })
  doctorSpecialty: string;

  @Prop({ required: true })
  hospitalName: string;

  @Prop({ required: true })
  hospitalCode: string;

  @Prop({ type: [PrescriptionItemSchema], required: true })
  items: PrescriptionItem[];

  @Prop({ required: true, default: 'PENDING', enum: ['PENDING', 'FILLED'] })
  status: string;
}

export const PrescriptionSchema = SchemaFactory.createForClass(Prescription);
