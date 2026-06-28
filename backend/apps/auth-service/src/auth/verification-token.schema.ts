import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum TokenType {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  TWO_FACTOR = 'two_factor',
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

  @Prop({ type: String, required: true })
  userId: string;
}

export const VerificationTokenSchema = SchemaFactory.createForClass(VerificationToken);
