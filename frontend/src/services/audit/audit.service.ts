import api from '../core/api';

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  module?: string;
  eventType?: string;
  severity?: string;
  status?: string;
  afterEventId?: string;
}

export interface AuditLogItem {
  _id: string;
  auditEventId: string;
  correlationId: string;
  requestId: string;
  sessionId?: string;
  userId?: string;
  username: string;
  role: string;
  branchId?: string;
  module: string;
  actionCode: string;
  actionName: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  entityVersion?: number;
  diff?: any;
  summary: string;
  payload?: {
    body?: any;
    query?: any;
    params?: any;
  };
  endpoint: string;
  method: string;
  ip: string;
  userAgent: string;
  browser: string;
  os: string;
  device: string;
  status: 'SUCCESS' | 'FAILED';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  error?: string;
  createdAt: string;
}

export interface AuditLogsResponse {
  items: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
}

export const auditService = {
  async getAuditLogs(query: AuditLogQuery): Promise<AuditLogsResponse> {
    const res = await api.get('/api/users/audit-logs', { params: query });
    return res.data;
  },

  async requestExport(query: AuditLogQuery): Promise<{ jobId: string; status: string }> {
    const res = await api.post('/api/users/audit-logs/export', query);
    return res.data;
  },

  async getExportStatus(jobId: string): Promise<{ id: string; status: string; filename?: string; totalRecords?: number; progress?: number; error?: string }> {
    const res = await api.get(`/api/users/audit-logs/export-status/${jobId}`);
    return res.data;
  },

  getDownloadUrl(filename: string): string {
    return `/api/users/audit-logs/download/${filename}`;
  }
};
