import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BranchDocument = Branch & Document;

@Schema({ _id: false })
export class BranchStats {
  @Prop({ default: 0 })
  employees: number;

  @Prop({ default: 0 })
  totalStock: number;

  @Prop({ default: 0 })
  lowStock: number;

  @Prop({ default: 0 })
  expiring: number;
}

@Schema({ _id: false })
export class BranchAlert {
  @Prop({ required: true })
  id: number;

  @Prop({ required: true, enum: ['low_stock', 'expiring'] })
  type: string;

  @Prop({ required: true })
  item: string;

  @Prop()
  current?: number;

  @Prop()
  min?: number;

  @Prop()
  expiryDate?: string;

  @Prop({ required: true })
  time: string;
}

@Schema({ timestamps: true, collection: 'branches' })
export class Branch {
  @Prop({ required: true, unique: true })
  branchCode: string; // BR-001, BR-002, etc.

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  image: string;

  @Prop({ required: true, enum: ['active', 'maintenance'], default: 'active' })
  status: string;

  @Prop({ required: true })
  manager: string;

  @Prop({ required: true })
  contact: string;

  @Prop({ type: BranchStats, default: () => ({}) })
  stats: BranchStats;

  @Prop({ type: [BranchAlert], default: [] })
  alerts: BranchAlert[];
}

export const BranchSchema = SchemaFactory.createForClass(Branch);
