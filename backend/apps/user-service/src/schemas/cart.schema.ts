import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class CartItem {
  @Prop({ required: true })
  medicineId: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true })
  addedPrice: number; // Price when added to cart (used to check for priceChanged warnings)
}
export const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({ timestamps: true, collection: 'carts' })
export class Cart extends Document {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];
}
export const CartSchema = SchemaFactory.createForClass(Cart);
