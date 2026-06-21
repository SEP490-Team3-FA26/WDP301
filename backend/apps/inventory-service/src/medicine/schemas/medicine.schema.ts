import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'medicines' })
export class Medicine extends Document {
  @Prop()
  name: string;

  @Prop()
  category: string;

  @Prop()
  image: string;

  @Prop()
  images: string[];

  @Prop()
  cong_dung: string;

  @Prop()
  cach_dung: string;

  @Prop()
  tac_dung_phu: string;

  @Prop({ type: Object })
  thong_tin_chi_tiet: any;

  @Prop({ default: 0 })
  price: number;

  @Prop({ default: 'COMMON_SUPPLEMENT' })
  drug_classification: string;

  @Prop()
  active_ingredient: string;

  @Prop()
  registration_number: string;

  @Prop()
  manufacturer: string;

  @Prop()
  dosage_form: string;

  @Prop()
  supplierId: string;

  @Prop()
  status: string;

  @Prop({ default: 0, min: 0 })
  stock: number;

  @Prop()
  unit: string;

  @Prop()
  expiry_date?: string;

  @Prop({ sparse: true })
  sku?: string;

  @Prop({ sparse: true })
  barcode?: string;
}

export const MedicineSchema = SchemaFactory.createForClass(Medicine);
