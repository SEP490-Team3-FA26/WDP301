import api from '../core/api';

export interface BranchData {
  name: string;
  address: string;
  phone: string;
}

export const branchService = {
  async getBranches() {
    const response = await api.get('/api/branches');
    return response.data;
  },

  async createBranch(data: BranchData) {
    const response = await api.post('/api/branches', data);
    return response.data;
  },

  async updateBranch(id: string, data: Partial<BranchData>) {
    const response = await api.put(`/api/branches/${id}`, data);
    return response.data;
  },

  async deleteBranch(id: string) {
    const response = await api.delete(`/api/branches/${id}`);
    return response.data;
  }
};
