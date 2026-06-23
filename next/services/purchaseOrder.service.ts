import api from './api';

export interface PurchaseOrderItem {
  medicineId: string;
  quantity: number;
  price: number;
}

export interface PurchaseOrderPayload {
  supplierId: string;
  items: PurchaseOrderItem[];
  deliveryDate?: string;
  remarks?: string;
}

export const purchaseOrderService = {
  async getPurchaseOrders() {
    const response = await api.get('/api/purchase-orders');
    return response.data;
  },

  async createPurchaseOrder(payload: PurchaseOrderPayload) {
    const response = await api.post('/api/purchase-orders', payload);
    return response.data;
  }
};
