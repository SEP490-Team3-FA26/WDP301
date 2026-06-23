import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'suppliercredittransactions' })
export class SupplierCreditTransaction extends Document {
  @Prop({ type: String, required: true })
  supplierId: string; // Ref tới suppliers._id

  @Prop({
    type: String,
    required: true,
    enum: ['GRN_PAYABLE', 'PAYMENT', 'ADJUSTMENT'],
  })
  type: string;

  @Prop({ type: Number, required: true })
  amount: number; // Dương = phát sinh nợ (nhập kho), Âm = thanh toán

  @Prop({ type: Number, default: 0 })
  balanceBefore: number;

  @Prop({ type: Number, default: 0 })
  balanceAfter: number;

  @Prop({ type: String })
  referenceId: string; // ID GRN hoặc phiếu chi

  @Prop({ type: String, enum: ['GOODS_RECEIPT', 'PAYMENT_VOUCHER'] })
  referenceType: string;

  @Prop({ type: Date })
  dueDate: Date; // Ngày đến hạn thanh toán

  @Prop({ type: Date })
  paidAt: Date; // Ngày thanh toán thực tế

  @Prop({ type: String, enum: ['CASH', 'BANK_TRANSFER'] })
  paymentMethod: string;

  @Prop({ type: String })
  notes: string;

  @Prop({ type: String })
  performedBy: string;
}

export const SupplierCreditTransactionSchema =
  SchemaFactory.createForClass(SupplierCreditTransaction);
