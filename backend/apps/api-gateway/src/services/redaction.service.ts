import { Injectable } from '@nestjs/common';

@Injectable()
export class RedactionService {
  private readonly sensitiveKeys = new Set([
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'newPassword',
    'oldPassword',
    'apiKey',
    'otp',
    'cardNo',
    'cccd',
    'bankAccount',
  ]);

  /**
   * Recursively masks sensitive fields in payloads (body, query, params)
   */
  mask(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.mask(item));
    }

    if (typeof data === 'object') {
      const masked = {};
      for (const key of Object.keys(data)) {
        const val = data[key];
        
        // Match against exact sensitive keys
        if (this.sensitiveKeys.has(key)) {
          masked[key] = '********';
        } else if (key === 'phone' || key === 'phoneNumber') {
          masked[key] = this.maskPhone(val);
        } else if (key === 'email') {
          masked[key] = this.maskEmail(val);
        } else if (typeof val === 'object') {
          masked[key] = this.mask(val);
        } else {
          masked[key] = val;
        }
      }
      return masked;
    }

    return data;
  }

  private maskPhone(phone: any): string {
    if (typeof phone !== 'string') return String(phone);
    if (phone.length < 6) return '***';
    return phone.slice(0, 3) + '***' + phone.slice(-3);
  }

  private maskEmail(email: any): string {
    if (typeof email !== 'string') return String(email);
    const parts = email.split('@');
    if (parts.length !== 2) return '********';
    const name = parts[0];
    const domain = parts[1];
    if (name.length < 3) return '***@' + domain;
    return name.slice(0, 2) + '***@' + domain;
  }
}
