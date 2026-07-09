import { SetMetadata } from '@nestjs/common';

export const AUDIT_LOG_ACTION_KEY = 'audit_log_action';

export interface AuditLogOptions {
  actionCode: string; // E.g., ORDER_CREATE, LOGIN_FAILED, MEDICINE_PRICE_UPDATE
  actionName: string; // E.g., "Tạo đơn hàng", "Cập nhật giá thuốc"
  module: string; // E.g., Inventory, Sales, Purchase, Voucher, Auth, Customer, Supplier
  eventType: string; // E.g., CREATE, UPDATE, DELETE, READ, LOGIN, LOGOUT, APPROVE, REJECT, EXPORT, SECURITY
  severity?: string; // Mặc định INFO. Levels: INFO, WARNING, ERROR, CRITICAL
  recordRead?: boolean; // Nếu true, GET request vẫn ghi log (dành cho export, xem báo cáo)
  entityType?: string; // Tên thực thể chịu tác động (ví dụ: Medicine)
}

/**
 * Decorator để khai báo cấu hình Audit Log chi tiết cho từng api/method
 */
export const AuditLogAction = (options: AuditLogOptions) => SetMetadata(AUDIT_LOG_ACTION_KEY, options);
