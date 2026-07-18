import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ required: true, unique: true, index: true })
  auditEventId: string; // UUID for idempotency

  @Prop({ required: true, index: true })
  correlationId: string; // Tracing ID across microservices

  @Prop({ type: String, default: null, index: true })
  requestId: string; // API Gateway HTTP Request ID

  @Prop({ type: String, default: null, index: true })
  sessionId: string; // User Session ID

  @Prop({ type: String, default: null, index: true })
  userId: string; // User ID (null if anonymous/guest)

  @Prop({ required: true })
  username: string; // User Email or Username

  @Prop({ required: true, index: true })
  role: string; // User Role (e.g. admin, warehouse, branch, guest)

  @Prop({ type: String, default: null, index: true })
  branchId: string; // User Branch ID (for scope-based branch filtering)

  @Prop({ required: true, index: true })
  module: string; // Module name (e.g. Inventory, Sales, Purchase, Voucher, Auth, Customer)

  @Prop({ required: true, index: true })
  actionCode: string; // Action key (e.g. ORDER_CREATE, MEDICINE_PRICE_UPDATE)

  @Prop({ required: true })
  actionName: string; // Descriptive Vietnamese action name

  @Prop({ required: true, index: true })
  eventType: string; // Action type (CREATE, UPDATE, DELETE, READ, LOGIN, LOGOUT, APPROVE, EXPORT, SECURITY)

  @Prop({ type: String, default: null, index: true })
  entityType: string; // Affected model type (e.g. Medicine, PurchaseOrder)

  @Prop({ type: String, default: null, index: true })
  entityId: string; // Affected model ID

  @Prop({ type: String, default: null })
  entityName: string; // Affected model display code/name (e.g. PO-00123)

  @Prop({ type: Number, default: null })
  entityVersion: number; // Mongoose schema version __v or custom version

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  diff: any; // Key-value object representing old/new value differences

  @Prop({ type: String, default: null })
  summary: string; // Text description summary of changes or large payload truncation notice

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  payload: any; // Masked request body, params, query parameters

  @Prop({ required: true })
  endpoint: string; // HTTP API path

  @Prop({ required: true })
  method: string; // HTTP Method (POST, GET, etc.)

  @Prop({ required: true })
  ip: string; // Client IP address

  @Prop({ type: String, default: null })
  userAgent: string; // Full User Agent string

  @Prop({ type: String, default: null })
  browser: string; // Browser name (e.g. Chrome, Safari)

  @Prop({ type: String, default: null })
  os: string; // OS name (e.g. Windows, macOS)

  @Prop({ type: String, default: null })
  device: string; // Device type (e.g. Desktop, Mobile)

  @Prop({ required: true, index: true })
  status: string; // Action result status (SUCCESS, FAILED)

  @Prop({ required: true, index: true })
  severity: string; // Level of importance (INFO, WARNING, ERROR, CRITICAL)

  @Prop({ type: String, default: null })
  error: string; // Error logs/stacktrace if failed

  // Note: timestamps: true will automatically generate createdAt and updatedAt
  createdAt?: Date;
  updatedAt?: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// 1. TTL Index: Automatically expire logs after 365 days (31536000 seconds)
// Cleaned up asynchronously by MongoDB's TTL Monitor thread (usually runs every 60s)
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

// 2. High-performance Full-Text Index on search fields (replaces slow $regex searches)
AuditLogSchema.index(
  { username: 'text', actionName: 'text', endpoint: 'text', entityId: 'text', summary: 'text' },
  { name: 'audit_logs_text_index' }
);
