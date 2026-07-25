import api from '../core/api';

export const prescriptionService = {
  async getPrescriptions() {
    try {
      const response = await api.get('/api/prescriptions');
      return Array.isArray(response?.data) ? response.data : [];
    } catch {
      return [];
    }
  },

  async getPrescriptionByCode(code: string) {
    const response = await api.get(`/api/prescriptions/${code}`);
    return response.data;
  },

  async recommendPrescription(formData: FormData) {
    const response = await api.post('/api/prescriptions/recommend', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async scanPrescriptionAI(formData: FormData) {
    const response = await api.post('/api/prescriptions/scan-ai', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

