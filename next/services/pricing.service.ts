import api from './api';

export interface PricingQueryParams {
  page?: number | string;
  limit?: number | string;
  search?: string;
}

export interface SavePricingData {
  isActive?: boolean;
  retailPrice?: number;
  wholesalePrice?: number;
  wholesaleTiers?: { minQuantity: number; price: number }[];
}

export const pricingService = {
  async getBranchPrices(branchId: string, params: PricingQueryParams = {}) {
    const response = await api.get(`/api/pricing/${branchId}`, { params });
    return response.data;
  },

  async saveBranchPrice(branchId: string, medicineId: string, data: SavePricingData) {
    const response = await api.put(`/api/pricing/${branchId}/${medicineId}`, data);
    return response.data;
  },

  async deleteBranchPrice(branchId: string, medicineId: string) {
    const response = await api.delete(`/api/pricing/${branchId}/${medicineId}`);
    return response.data;
  },

  async copyPrices(fromBranchId: string, toBranchId: string) {
    const response = await api.post('/api/pricing/copy', { fromBranchId, toBranchId });
    return response.data;
  }
};
