import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QuotaDocument = Quota & Document;

@Schema({ timestamps: true })
export class Quota {
  @Prop({ required: true })
  branchId: string;

  @Prop()
  branchName?: string;

  @Prop({ required: true })
  cycle: string;

  @Prop({ required: true, default: 0 })
  totalBudget: number;

  @Prop({ default: 0 })
  usedAmount: number;

  @Prop({ default: 'Active' })
  status: string;

  @Prop()
  note?: string;
}

export const QuotaSchema = SchemaFactory.createForClass(Quota);

QuotaSchema.index({ branchId: 1, cycle: 1 }, { unique: true });

