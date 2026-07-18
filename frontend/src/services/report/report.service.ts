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
  },
  getDashboardSummary: async (branchId?: string) => {
    try {
      const url = branchId && branchId !== 'all' ? `/api/reports/dashboard/summary?branchId=${branchId}` : `/api/reports/dashboard/summary`;
      const res = await api.get(url);
      return res.data;
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu summary dashboard:", error);
      return null;
    }
  },
  getSeasonalAnalysis: async (branchId?: string) => {
    try {
      const url = branchId && branchId !== 'all' ? `/api/reports/seasonal-analysis?branchId=${branchId}` : `/api/reports/seasonal-analysis`;
      const res = await api.get(url);
      return res.data;
    } catch (error) {
      console.error("Lỗi khi lấy phân tích xu hướng mùa/dịch bệnh:", error);
      return null;
    }
  },
  evictSeasonalAnalysis: async (branchId?: string) => {
    try {
      const url = branchId && branchId !== 'all' ? `/api/reports/seasonal-analysis/evict?branchId=${branchId}` : `/api/reports/seasonal-analysis/evict`;
      const res = await api.post(url);
      return res.data;
    } catch (error) {
      console.error("Lỗi khi xóa cache phân tích xu hướng:", error);
      return null;
    }
  }
};
