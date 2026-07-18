import api from '../core/api';

const PENDING_EMAIL_KEY = "pendingVerificationEmail";

export const authService = {
  getPendingEmail(): string {
    return localStorage.getItem(PENDING_EMAIL_KEY) || "";
  },

  setPendingEmail(email: string): void {
    localStorage.setItem(PENDING_EMAIL_KEY, email);
  },

  clearPendingEmail(): void {
    localStorage.removeItem(PENDING_EMAIL_KEY);
  },

  async login(email: string, password: string) {
    try {
      const response = await api.post('/api/auth/login', { email, password });
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Đăng nhập thất bại (Máy chủ không phản hồi đúng định dạng).';
      throw new Error(msg);
    }
  },

  async register(fullName: string, email: string, password: string) {
    try {
      const response = await api.post('/api/auth/register', { fullName, email, password, role: 'user' });
      this.setPendingEmail(email);
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Đăng ký thất bại';
      throw new Error(msg);
    }
  },

  async verifyEmail(email: string, token: string) {
    try {
      const response = await api.post('/api/auth/verify-email', { email, token });
      this.clearPendingEmail();
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Xác thực tài khoản thất bại';
      throw new Error(msg);
    }
  },

  async resendVerification(email: string) {
    try {
      const response = await api.post('/api/auth/resend-verification', { email });
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể gửi lại mã OTP';
      throw new Error(msg);
    }
  },

  async forgotPassword(email: string) {
    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Yêu cầu thất bại';
      throw new Error(msg);
    }
  },

  async resetPassword(email: string, token: string, newPassword: string) {
    try {
      const response = await api.post('/api/auth/reset-password', { email, token, newPassword });
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Đặt lại mật khẩu thất bại';
      throw new Error(msg);
    }
  }
};
