import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'processed_transactions' })
export class ProcessedTransaction extends Document {
  @Prop({ type: String, required: true, unique: true })
  transactionId: string;
}
export const ProcessedTransactionSchema = SchemaFactory.createForClass(ProcessedTransaction);
