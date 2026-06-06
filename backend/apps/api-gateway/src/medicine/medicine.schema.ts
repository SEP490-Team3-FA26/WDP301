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

  @Prop()
  stock: number;

  @Prop()
  status: string;

  @Prop()
  expiry_date: string;

  @Prop()
  unit: string;
}

export const MedicineSchema = SchemaFactory.createForClass(Medicine);
