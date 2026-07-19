import api from '../core/api';

export interface QuotaData {
  _id?: string;
  branchId: string;
  branchName?: string;
  cycle: string;
  totalBudget: number;
  usedAmount?: number;
  status: string;
  note?: string;
}

export interface QuotaSummary {
  cycle: string;
  totalBudget: number;
  totalUsed: number;
  totalRemaining: number;
  branchCount: number;
}

export const quotaService = {
  getQuotaSummary: async (cycle: string): Promise<QuotaSummary> => {
    const response = await api.get('/api/quotas/summary', { params: { cycle } });
    return response.data;
  },

  getQuotas: async (params?: { branchId?: string; cycle?: string }): Promise<QuotaData[]> => {
    const response = await api.get('/api/quotas', { params });
    return response.data;
  },

  getQuotaByBranch: async (branchId: string): Promise<QuotaData[]> => {
    const response = await api.get(`/api/quotas/branch/${branchId}`);
    return response.data;
  },

  getQuotaById: async (id: string): Promise<QuotaData> => {
    const response = await api.get(`/api/quotas/${id}`);
    return response.data;
  },

  createQuota: async (data: QuotaData): Promise<QuotaData> => {
    const response = await api.post('/api/quotas', data);
    return response.data;
  },

  updateQuota: async (id: string, data: Partial<QuotaData>): Promise<QuotaData> => {
    const response = await api.put(`/api/quotas/${id}`, data);
    return response.data;
  },

  deleteQuota: async (id: string): Promise<void> => {
    await api.delete(`/api/quotas/${id}`);
  }
};
