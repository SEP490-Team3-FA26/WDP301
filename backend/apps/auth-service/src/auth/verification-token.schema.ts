import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum TokenType {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
}

@Schema({ timestamps: true })
export class VerificationToken extends Document {
  @Prop({ required: true, index: true })
  token: string;

  @Prop({ type: String, enum: TokenType, required: true })
  type: TokenType;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  isUsed: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;
}

export const VerificationTokenSchema = SchemaFactory.createForClass(VerificationToken);
