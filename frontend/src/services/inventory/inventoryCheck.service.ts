import api from '../core/api';

export interface InventoryCheckItem {
  medicineId: string;
  medicineName?: string;
  batchNo: string;
  systemStock: number;
  actualStock: number;
  difference?: number;
  reason?: string;
}

export interface InventoryCheckPayload {
  status: 'DRAFT' | 'COMPLETED';
  items: {
    medicineId: string;
    batchNo: string;
    actualStock: number;
    reason?: string;
  }[];
  performedBy?: string;
  notes?: string;
}

export const inventoryCheckService = {
  async getChecks() {
    const response = await api.get('/api/inventory-checks');
    return response.data;
  },

  async getCheckById(id: string) {
    const response = await api.get(`/api/inventory-checks/${id}`);
    return response.data;
  },

  async createCheck(payload: InventoryCheckPayload) {
    const response = await api.post('/api/inventory-checks', payload);
    return response.data;
  },

  async completeCheck(id: string) {
    const response = await api.post(`/api/inventory-checks/${id}/complete`);
    return response.data;
  }
};
