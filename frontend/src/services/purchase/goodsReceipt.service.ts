import api from '../core/api';

export interface GoodsReceiptItem {
  medicineId: string;
  batchNo: string;
  expDate: string;
  quantity: number;
  unitPrice: number;
  actualQty?: number;
}

export interface GoodsReceiptPayload {
  poId: string;
  receivedBy: string;
  items: GoodsReceiptItem[];
}

export const goodsReceiptService = {
  async getGoodsReceipts() {
    const response = await api.get('/api/goods-receipts');
    return response.data;
  },

  async createGoodsReceipt(payload: GoodsReceiptPayload) {
    const response = await api.post('/api/goods-receipts', payload);
    return response.data;
  },

  async updateGoodsReceipt(id: string, payload: any) {
    const response = await api.patch(`/api/goods-receipts/${id}`, payload);
    return response.data;
  },

  async submitInspection(id: string) {
    const response = await api.post(`/api/goods-receipts/${id}/submit-inspection`);
    return response.data;
  },

  async approveGoodsReceipt(id: string, discrepancyReason?: string) {
    const response = await api.post(`/api/goods-receipts/${id}/approve`, { discrepancyReason });
    return response.data;
  },

  async rejectGoodsReceipt(id: string, action: "reinspect" | "cancel", reason: string) {
    const response = await api.post(`/api/goods-receipts/${id}/reject`, { action, reason });
    return response.data;
  },

  async createInspectionRecord(grnId: string, inspectedBy: string) {
    const response = await api.post('/api/goods-receipts/inspections', { grnId, inspectedBy });
    return response.data;
  },

  async verifyInspectionItem(recordId: string, itemId: string, actualQty: number) {
    const response = await api.post('/api/goods-receipts/inspections/verify', { recordId, itemId, actualQty });
    return response.data;
  },

  async submitInspectionReport(recordId: string, notes: string) {
    const response = await api.post('/api/goods-receipts/inspections/submit', { recordId, notes });
    return response.data;
  }
};
