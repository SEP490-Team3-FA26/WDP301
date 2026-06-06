import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum DrugClassification {
  PRESCRIPTION_ANTIBIOTIC = 'PRESCRIPTION_ANTIBIOTIC',
  PSYCHOTROPIC_SLEEP = 'PSYCHOTROPIC_SLEEP',
  COMMON_SUPPLEMENT = 'COMMON_SUPPLEMENT',
}

@Schema({ timestamps: true, collection: 'products' })
export class Product extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  sku: string;

  @Prop()
  active_ingredient: string;

  @Prop({ default: 0 })
  price: number;

  @Prop({ default: 0 })
  stock: number;

  @Prop({
    required: true,
    enum: DrugClassification,
  })
  drug_classification: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
