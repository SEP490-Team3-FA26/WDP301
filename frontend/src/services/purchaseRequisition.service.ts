import api from './api';

export interface PurchaseRequisitionItem {
  medicineId: string;
  requestedQuantity: number;
  unit: string;
}

export interface PurchaseRequisitionPayload {
  reason: string;
  items: PurchaseRequisitionItem[];
  branchName: string;
}

export const purchaseRequisitionService = {
  async getPurchaseRequisitions(status?: string) {
    const url = status ? `/api/purchase-requisitions?status=${status}` : '/api/purchase-requisitions';
    const response = await api.get(url);
    return response.data;
  },

  async createPurchaseRequisition(payload: PurchaseRequisitionPayload) {
    const response = await api.post('/api/purchase-requisitions', payload);
    return response.data;
  },

  async consolidatePurchaseRequisitions(prIds: string[]) {
    const response = await api.post('/api/purchase-requisitions/consolidate', { prIds });
    return response.data;
  },

  async approvePurchaseRequisition(prIds: string[], action: 'APPROVE' | 'REJECT', rejectionReason?: string) {
    const response = await api.post('/api/purchase-requisitions/approve', {
      prIds,
      action,
      rejectionReason,
    });
    return response.data;
  }
};
