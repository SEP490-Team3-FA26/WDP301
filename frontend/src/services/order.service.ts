import api from './api';

export interface OrderItem {
  medicineId: string;
  name?: string;
  quantity: number;
  price?: number;
  unit?: string;
}

export interface OrderPayload {
  patientName?: string;
  patientPhone?: string;
  totalAmount?: number;
  items: OrderItem[];
  paymentMethod?: string;
  soldBy?: string;
  shippingAddress?: string;
  notes?: string;
  voucherCode?: string;
}

export interface SalePayload {
  type: 'RETAIL' | 'PRESCRIPTION' | 'WHOLESALE';
  prescriptionCode?: string;
  patientName?: string;
  patientAge?: number;
  patientGender?: string;
  patientPhone?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  hospitalName?: string;
  hospitalCode?: string;
  items: {
    medicineId: string;
    quantity: number;
  }[];
  paymentMethod: string;
  soldBy: string;
  remarks?: string;
}

export interface PayOSLinkPayload {
  patientName: string;
  patientPhone: string;
  totalAmount: number;
  voucherCode?: string;
  items: {
    medicineId: string;
    name: string;
    quantity: number;
    price: number;
    unit: string;
  }[];
}

export const orderService = {
  async createOrder(payload: OrderPayload) {
    const response = await api.post('/api/orders', payload);
    return response.data;
  },

  async checkOrderStatus(orderCode: number | string) {
    const response = await api.get(`/api/orders/check/${orderCode}`);
    return response.data;
  },

  async createPayOSLink(payload: PayOSLinkPayload) {
    const response = await api.post('/api/orders/payos-link', payload);
    return response.data;
  },

  async createSale(payload: SalePayload) {
    const response = await api.post('/api/sales', payload);
    return response.data;
  }
};
