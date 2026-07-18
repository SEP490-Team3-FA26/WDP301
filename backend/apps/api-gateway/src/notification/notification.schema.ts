import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification extends Document {
  @Prop({ required: true, enum: ['NEW_PR', 'PR_APPROVED', 'PR_REJECTED', 'NEW_PO', 'GRN_COMPLETED'] })
  type: string;

  @Prop({ required: true, index: true })
  targetRoom: string; // 'admin', 'warehouse', 'branch-BR-001', etc.

  @Prop({ required: true })
  message: string;

  @Prop({ type: [String], default: [] })
  readBy: string[]; // Array of userIds that have read this notification

  // Metadata fields
  @Prop() prId?: string;
  @Prop() prCode?: string;
  @Prop() poId?: string;
  @Prop() grnId?: string;
  @Prop() branchId?: string;
  @Prop() branchName?: string;
  @Prop() itemsCount?: number;
  @Prop() totalAmount?: number;
  @Prop() supplierName?: string;
  @Prop() rejectionReason?: string;
  @Prop() approvedBy?: string;
  @Prop() receivedBy?: string;
  @Prop() createdBy?: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Auto-delete notifications older than 90 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
// Speed up queries by targetRoom + createdAt
NotificationSchema.index({ targetRoom: 1, createdAt: -1 });
