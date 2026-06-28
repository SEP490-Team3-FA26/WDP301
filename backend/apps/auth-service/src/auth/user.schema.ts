import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum UserRole {
  ADMIN = 'admin',
  HEAD_BRANCH = 'head_branch',
  WAREHOUSE = 'warehouse',
  BRANCH = 'branch',
  PHARMACIST = 'pharmacist',
  USER = 'user',
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  fullName: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.PHARMACIST })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  avatarUrl?: string;

  @Prop()
  googleId?: string;

  @Prop({ default: null })
  branchId?: string;

  @Prop({ default: false })
  isTwoFactorEnabled: boolean;

  @Prop({ unique: true, sparse: true })
  phone?: string;

  @Prop({ default: 0 })
  points: number;

  @Prop({ default: 0 })
  accumulatedPoints: number;
}

export const UserSchema = SchemaFactory.createForClass(User);

