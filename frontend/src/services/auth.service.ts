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
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    let data;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      throw new Error('Không thể kết nối đến máy chủ. Backend có thể đang khởi động...');
    }

    if (!response.ok) {
      throw new Error(data.message || 'Đăng nhập thất bại (Máy chủ không phản hồi đúng định dạng).');
    }

    return data;
  },

  async register(fullName: string, email: string, password: string) {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, password, role: 'user' }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Đăng ký thất bại');
    }

    // Backup email to localStorage in case URL search params are lost during redirect
    this.setPendingEmail(email);

    return data;
  },

  async verifyEmail(email: string, token: string) {
    const response = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Xác thực tài khoản thất bại');
    }

    // Successfully verified, clear the backup email
    this.clearPendingEmail();

    return data;
  },

  async resendVerification(email: string) {
    const response = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Không thể gửi lại mã OTP');
    }

    return data;
  },

  async forgotPassword(email: string) {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Yêu cầu thất bại');
    }

    return data;
  },

  async resetPassword(email: string, token: string, newPassword: string) {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Đặt lại mật khẩu thất bại');
    }

    return data;
  }
};
