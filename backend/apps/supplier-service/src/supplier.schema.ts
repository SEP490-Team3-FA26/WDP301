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
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);
