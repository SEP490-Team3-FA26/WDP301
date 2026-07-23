import api from '../core/api';

export interface Employee {
  _id: string;
  email: string;
  fullName: string;
  role: string;
  branchId?: string;
  isActive: boolean;
  isEmailVerified: boolean;
  isApproved?: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  updatedAt?: string;
}

export const employeeService = {
  // Lấy danh sách nhân viên
  getEmployees: async (params?: { role?: string; branchId?: string; unassigned?: boolean }) => {
    const response = await api.get('/api/admin/employees', { params });
    return response.data;
  },

  // Lấy chi tiết nhân viên
  getEmployeeById: async (id: string) => {
    const response = await api.get(`/api/admin/employees/${id}`);
    return response.data;
  },

  // Tạo nhân viên mới
  createEmployee: async (data: any) => {
    const response = await api.post('/api/admin/employees', data);
    return response.data;
  },

  // Cập nhật thông tin nhân viên
  updateEmployee: async (id: string, data: any) => {
    const response = await api.put(`/api/admin/employees/${id}`, data);
    return response.data;
  },

  // Khóa / Mở khóa nhân viên
  toggleBanEmployee: async (id: string) => {
    const response = await api.put(`/api/admin/employees/${id}/ban`);
    return response.data;
  },

  // Xóa nhân viên
  deleteEmployee: async (id: string) => {
    const response = await api.delete(`/api/admin/employees/${id}`);
    return response.data;
  },

  // Phê duyệt / Từ chối nhân viên (chỉ Admin)
  approveEmployee: async (id: string, action: 'approve' | 'reject') => {
    const response = await api.put(`/api/admin/employees/${id}/approve`, { action });
    return response.data;
  },
};
