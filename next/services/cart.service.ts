import api from './api';

export const cartService = {
  async getCart() {
    const response = await api.get('/api/users/cart');
    return response.data;
  },

  async addToCart(medicineId: string, quantity: number) {
    const response = await api.post('/api/users/cart', { medicineId, quantity });
    return response.data;
  },

  async updateCartItem(id: string, quantity: number) {
    const response = await api.put(`/api/users/cart/${id}`, { quantity });
    return response.data;
  },

  async deleteCartItem(id: string) {
    const response = await api.delete(`/api/users/cart/${id}`);
    return response.data;
  },

  async clearCart() {
    const response = await api.post('/api/users/cart/clear');
    return response.data;
  }
};
