import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'suppliers' })
export class Supplier extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  contact_info: string;

  @Prop()
  business_registration_number: string;

  @Prop({ required: true })
  gdp_certificate_number: string;

  @Prop({ required: true })
  gdp_expiry_date: Date;

  @Prop({ default: 'ACTIVE', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'] })
  status: string;

  @Prop({ type: Number, default: 50000000, min: 0 })
  creditLimit: number; // Hạn mức công nợ tối đa (VNĐ) — UC-07

  @Prop({ type: Number, default: 0 })
  currentDebt: number; // Dư nợ hiện tại phải trả NCC (VNĐ) — UC-07

  @Prop({ type: Number, default: 30 })
  paymentTermDays: number; // Kỳ hạn thanh toán (ngày) — UC-07
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);
