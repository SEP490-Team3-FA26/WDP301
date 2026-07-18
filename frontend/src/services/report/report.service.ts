import api from '../core/api';

export const reportService = {
  getHistory: async (branchId?: string, type?: string) => {
    try {
      const params = new URLSearchParams();
      if (branchId) params.append('branchId', branchId);
      if (type) params.append('type', type);
      
      const res = await api.get(`/api/reports/history?${params.toString()}`);
      if (Array.isArray(res.data)) {
        return res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        return res.data.data;
      } else if (res.data) {
        return res.data;
      }
      return [];
    } catch (error) {
      console.error("Lỗi khi lấy lịch sử báo cáo:", error);
      return [];
    }
  }
};
