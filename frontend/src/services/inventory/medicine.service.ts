import api from '../core/api';

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
  [key: string]: unknown;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination?: PaginationInfo;
}

export interface Medicine {
  id: string;
  name: string;
  price?: number;
  sku?: string;
  image?: string;
  images?: string[];
  active_ingredient?: string;
  drug_classification?: string;
  type?: string;
  unit?: string;
  supplierId?: string;
  status?: string;
}

export const medicineService = {
  async getMedicines(params: MedicineQueryParams = {}) {
    const response = await api.get<PaginatedResult<Medicine>>('/api/medicines', { params });
    return response.data as PaginatedResult<Medicine>;
  },

  async getMedicineById(id: string) {
    const response = await api.get<Medicine>(`/api/medicines/${id}`);
    return response.data as Medicine;
  },

  async getAlternatives(id: string, branchId: string) {
    const response = await api.get(`/api/medicines/${id}/alternatives`, { params: { branchId } });
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
  },

  async updatePriceTiers(id: string, priceTiers: { minQuantity: number; price: number }[]) {
    const response = await api.patch(`/api/medicines/${id}/price-tiers`, { priceTiers });
    return response.data;
  },

  async updatePrice(id: string, price: number) {
    const response = await api.patch<{ success?: boolean; message?: string; price?: number }>(`/api/medicines/${id}/price`, { price });
    return response.data;
  },

  async getImportExportReport(startDate?: string, endDate?: string) {
    const response = await api.get('/api/inventory-transactions/report', {
      params: { startDate, endDate }
    });
    return response.data;
  },

  async getLowStockReport() {
    const response = await api.get('/api/medicines/low-stock-report');
    return response.data;
  },

  async getMedicinesDropdown() {
    const response = await api.get('/api/medicines/dropdown');
    return response.data;
  }
};

