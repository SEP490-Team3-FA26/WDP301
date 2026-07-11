import api from './api';

export interface SupplierData {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
}

export const supplierService = {
  async getSuppliers() {
    const response = await api.get('/api/suppliers');
    return response.data;
  },

  async createSupplier(data: SupplierData) {
    const response = await api.post('/api/suppliers', data);
    return response.data;
  },

  async updateSupplier(id: string, data: Partial<SupplierData>) {
    const response = await api.put(`/api/suppliers/${id}`, data);
    return response.data;
  },

  async deleteSupplier(id: string) {
    const response = await api.delete(`/api/suppliers/${id}`);
    return response.data;
  }
};
