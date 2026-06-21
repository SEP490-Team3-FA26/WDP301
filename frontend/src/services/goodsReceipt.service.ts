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
  }
};
