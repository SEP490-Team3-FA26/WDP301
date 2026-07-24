import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'expenses', timestamps: true })
export class Expense extends Document {
  @Prop({ required: true })
  branchId: string;

  @Prop()
  branchName: string;

  @Prop({ required: true, enum: ['RENT', 'SALARY', 'UTILITY', 'OTHER'] })
  category: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true, min: 0.01 })
  amount: number;

  @Prop({ default: Date.now })
  transactionDate: Date;

  @Prop()
  notes: string;

  @Prop()
  createdBy: string;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
