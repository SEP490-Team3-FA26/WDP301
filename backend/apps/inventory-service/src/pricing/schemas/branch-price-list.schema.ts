import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class WholesaleTier {
  @Prop({ type: Number, required: true, min: 1 })
  minQuantity: number;

  @Prop({ type: Number, required: true, min: 0 })
  price: number;
}
export const WholesaleTierSchema = SchemaFactory.createForClass(WholesaleTier);

@Schema({ timestamps: true, collection: 'branchpricelists' })
export class BranchPriceList extends Document {
  @Prop({ type: String, required: true })
  branchId: string; // Ref tới branches._id

  @Prop({ type: String, required: true })
  medicineId: string; // Ref tới medicines._id

  @Prop({ type: Number, default: null })
  retailPrice: number; // Giá bán lẻ tại chi nhánh (null → fallback medicine.price)

  @Prop({ type: Number, default: null })
  wholesalePrice: number; // Giá bán sỉ cơ bản

  @Prop({ type: [WholesaleTierSchema], default: [] })
  wholesaleTiers: WholesaleTier[]; // Bậc thang giá sỉ

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: String })
  updatedBy: string; // User ID thực hiện thay đổi
}

export const BranchPriceListSchema = SchemaFactory.createForClass(BranchPriceList);

// Compound unique index: mỗi thuốc chỉ có 1 entry giá / chi nhánh
BranchPriceListSchema.index({ branchId: 1, medicineId: 1 }, { unique: true });
