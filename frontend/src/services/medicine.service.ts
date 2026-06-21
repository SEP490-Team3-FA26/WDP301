import api from './api';

export interface MedicineQueryParams {
  page?: number | string;
  limit?: number | string;
  search?: string;
  category?: string;
  classification?: string;
  target?: string;
  targetGroup?: string;
  minPrice?: number | string;
  maxPrice?: number | string;
  flavour?: string;
  country?: string;
  brand?: string;
  indication?: string;
  brandOrigin?: string;
  _t?: number;
  [key: string]: any;
}

export const medicineService = {
  async getMedicines(params: MedicineQueryParams = {}) {
    const response = await api.get('/api/medicines', { params });
    return response.data;
  },

  async getMedicineById(id: string) {
    const response = await api.get(`/api/medicines/${id}`);
    return response.data;
  },

  async updateMedicineStatus(id: string, status: string) {
    const response = await api.patch(`/api/medicines/${id}/status`, { status });
    return response.data;
  },

  async getMedicineStats() {
    const response = await api.get('/api/medicines/stats');
    return response.data;
  },

  async getExpirationReport() {
    const response = await api.get('/api/medicines/expiration-report');
    return response.data;
  },

  async getFilters() {
    const response = await api.get('/api/medicines/filters');
    return response.data;
  },

  async checkInteraction(medicines: string[]) {
    const response = await api.post('/api/medicines/check-interaction', { medicines });
    return response.data;
  }
};
