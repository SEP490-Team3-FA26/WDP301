import api from '../core/api';

export interface StockTransferItem {
  medicineId: string;
  medicineName?: string;
  batchNo: string;
  quantity: number;
  unit: string;
}

export interface StockTransfer {
  _id: string;
  transferCode: string;
  prId: string;
  prCode: string;
  fromBranchId: string;
  toBranchId: string;
  toBranchName: string;
  items: StockTransferItem[];
  status: 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
  shippedBy?: string;
  receivedBy?: string;
  shippedAt?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const stockTransferService = {
  async getStockTransfers(status?: string, toBranchId?: string): Promise<StockTransfer[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (toBranchId) params.append('toBranchId', toBranchId);
    
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await api.get(`/api/stock-transfers${queryString}`);
    return response.data;
  },

  async getStockTransferById(id: string): Promise<StockTransfer> {
    const response = await api.get(`/api/stock-transfers/${id}`);
    return response.data;
  },

  async createStockTransfer(prId: string, fromBranchId: string, shippedBy: string): Promise<any> {
    const response = await api.post('/api/stock-transfers', { prId, fromBranchId, shippedBy });
    return response.data;
  },

  async confirmStockTransferReceipt(id: string, receivedBy: string): Promise<any> {
    const response = await api.post(`/api/stock-transfers/${id}/receive`, { receivedBy });
    return response.data;
  }
};
