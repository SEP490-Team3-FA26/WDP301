import api from './api';

export interface GoodsReceiptItem {
  medicineId: string;
  quantityReceived: number;
  batchNo: string;
  expiryDate: string;
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

  async createInspectionRecord(grnId: string, inspectedBy: string) {
    const response = await api.post('/api/goods-receipts/inspections', { grnId, inspectedBy });
    return response.data;
  },

  async verifyInspectionItem(recordId: string, itemId: string, actualQty: number) {
    const response = await api.post('/api/goods-receipts/inspections/verify', { recordId, itemId, actualQty });
    return response.data;
  },

  async submitInspectionReport(recordId: string) {
    const response = await api.post('/api/goods-receipts/inspections/submit', { recordId });
    return response.data;
  },

  async approveGoodsReceipt(recordId: string, approvedBy: string) {
    const response = await api.post('/api/goods-receipts/approve', { recordId, approvedBy });
    return response.data;
  },

  async getInspectionRecords() {
    const response = await api.get('/api/goods-receipts/inspections/all');
    return response.data;
  }
};
