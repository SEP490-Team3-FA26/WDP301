import api from './api';

export interface VoucherPayload {
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  minOrderValue: number;
  maxDiscountValue?: number;
  startDate: string;
  expiryDate: string;
  usageLimit?: number;
  isActive?: boolean;
}

export const voucherService = {
  async getVouchers() {
    const res = await api.get('/api/vouchers');
    return res.data;
  },
  async createVoucher(payload: VoucherPayload) {
    const res = await api.post('/api/vouchers', payload);
    return res.data;
  },
  async updateVoucher(id: string, payload: Partial<VoucherPayload>) {
    const res = await api.put(`/api/vouchers/${id}`, payload);
    return res.data;
  },
  async deleteVoucher(id: string) {
    const res = await api.delete(`/api/vouchers/${id}`);
    return res.data;
  },
  async validateVoucher(code: string, subtotal: number) {
    const res = await api.post('/api/vouchers/validate', { code, subtotal });
    return res.data;
  }
};
