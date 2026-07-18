import api from '../core/api';

export const prescriptionService = {
  async getPrescriptions() {
    const response = await api.get('/api/prescriptions');
    return response.data;
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
  }
};
