import api from '../core/api';

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
  async getPurchaseOrders(status?: string) {
    const response = await api.get('/api/purchase-orders', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  async createPurchaseOrder(payload: PurchaseOrderPayload) {
    const response = await api.post('/api/purchase-orders', payload);
    return response.data;
  }
};
