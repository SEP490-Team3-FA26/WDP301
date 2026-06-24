import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'vouchers' })
export class Voucher extends Document {
  @Prop({ type: String, required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ type: String, required: true, enum: ['PERCENTAGE', 'FIXED_AMOUNT'] })
  discountType: string;

  @Prop({ type: Number, required: true, min: 0 })
  discountValue: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  minOrderValue: number;

  @Prop({ type: Number, min: 0 })
  maxDiscountValue?: number;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  expiryDate: Date;

  @Prop({ type: Number, default: null })
  usageLimit?: number;

  @Prop({ type: Number, required: true, default: 0, min: 0 })
  usedCount: number;

  @Prop({ type: Boolean, required: true, default: true })
  isActive: boolean;
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);
