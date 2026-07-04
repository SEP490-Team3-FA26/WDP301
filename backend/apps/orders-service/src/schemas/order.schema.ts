import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class OrderItem {
  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: Number, required: true, min: 0 })
  price: number;

  @Prop({ type: String, required: true })
  unit: string;
}
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true, collection: 'orders' })
export class Order extends Document {
  @Prop({ type: Number, required: true, unique: true })
  orderCode: number; // PayOS 64-bit integer code

  @Prop({ type: String, required: true })
  patientName: string;

  @Prop({ type: String, required: true })
  patientPhone: string;

  @Prop({ type: String })
  shippingAddress: string;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount: number;

  @Prop({ type: String, required: true, default: 'QR_PAY', enum: ['CASH', 'CARD', 'QR_PAY'] })
  paymentMethod: string;

  @Prop({ type: String, required: true, default: 'PENDING', enum: ['PENDING', 'PAID', 'CANCELLED'] })
  paymentStatus: string;

  @Prop({ type: String })
  payosPaymentLinkId: string;

  @Prop({ type: String, default: 'ONLINE', enum: ['ONLINE', 'RETAIL'] })
  type: string;

  @Prop({ type: String })
  voucherCode?: string;

  @Prop({ type: Number, default: 0 })
  voucherDiscount?: number;

  @Prop({ type: String })
  userId?: string;
}
export const OrderSchema = SchemaFactory.createForClass(Order);
