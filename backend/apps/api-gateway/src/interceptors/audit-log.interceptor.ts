import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { ClientKafka } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { AUDIT_LOG_ACTION_KEY, AuditLogOptions } from '../decorators/audit-log.decorator';
import { RedactionService } from '../services/redaction.service';
import { AuditFallbackProcessor } from '../processors/audit-fallback.processor';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    @Inject('USER_SERVICE') private readonly userClient: ClientKafka,
    private readonly reflector: Reflector,
    private readonly redactionService: RedactionService,
    private readonly fallbackProcessor: AuditFallbackProcessor,
  ) {
    // Set the Kafka client reference inside processor for fallback retries
    this.fallbackProcessor.setKafkaClient(this.userClient);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    const handler = context.getHandler();
    const options = this.reflector.get<AuditLogOptions>(AUDIT_LOG_ACTION_KEY, handler);

    const method = request.method;
    const url = request.url;

    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const recordRead = options?.recordRead === true;

    // Skip audit logging if it is just a voucher active status toggle to reduce log noise
    const isVoucherStatusToggle =
      method === 'PUT' &&
      url.includes('/api/vouchers') &&
      request.body &&
      Object.keys(request.body).length === 1 &&
      request.body.hasOwnProperty('isActive');

    if (isVoucherStatusToggle) {
      return next.handle();
    }

    if (!isMutation && !recordRead) {
      return next.handle();
    }

    // 1. Resolve Correlation ID & Request ID
    const correlationId = (request.headers['x-correlation-id'] || request.headers['x-request-id'] || randomUUID()).toString();
    const requestId = randomUUID();

    // Attach to request headers to propagate to subsequent Kafka calls or downstream systems
    request.headers['x-correlation-id'] = correlationId;
    request.headers['x-request-id'] = requestId;

    // 2. Parse Device Information from User-Agent
    const userAgent = request.headers['user-agent'] || '';
    const { browser, os, device } = this.parseUserAgent(userAgent);

    const ip = request.ip || request.headers['x-forwarded-for'] || request.connection?.remoteAddress || '127.0.0.1';
    const sessionId = request.headers['x-session-id'] || request.user?.sessionId || null;

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (apiResponse) => {
          this.triggerAuditLog(request, apiResponse, options, correlationId, requestId, sessionId, ip, userAgent, browser, os, device, startTime, null);
        },
        error: (apiError) => {
          this.triggerAuditLog(request, null, options, correlationId, requestId, sessionId, ip, userAgent, browser, os, device, startTime, apiError);
        },
      }),
    );
  }

  private triggerAuditLog(
    request: any,
    apiResponse: any,
    options: AuditLogOptions | undefined,
    correlationId: string,
    requestId: string,
    sessionId: string | null,
    ip: string,
    userAgent: string,
    browser: string,
    os: string,
    device: string,
    startTime: number,
    error: any,
  ) {
    // Non-blocking background log publishing
    setTimeout(async () => {
      try {
        const user = request.user;
        const email = user?.email || request.body?.email || 'Guest';
        const role = user?.role || 'guest';
        const branchId = user?.branchId || null;
        const userId = user?.sub || null;

        const actionCode = options?.actionCode || `${request.method}_${request.route?.path || request.url}`.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase();
        const actionName = options?.actionName || this.getFallbackActionName(request.method, request.url);
        const module = options?.module || this.getFallbackModule(request.url);
        const eventType = options?.eventType || this.getFallbackEventType(request.method);
        const severity = options?.severity || (error ? 'ERROR' : 'INFO');
        const entityType = options?.entityType || null;

        let before = null;
        let after = null;
        let entityVersion = null;
        let diff = null;
        let entityId = request.params?.id || request.body?.id || null;
        let entityName = null;

        // Extract mutation diff if provided by the microservice response structure
        if (apiResponse && typeof apiResponse === 'object') {
          const auditObj = apiResponse.audit || (apiResponse.before || apiResponse.after ? apiResponse : null);
          if (auditObj) {
            before = auditObj.before || null;
            after = auditObj.after || null;
            entityVersion = auditObj.entityVersion || apiResponse.entityVersion || null;
            entityId = auditObj.entityId || entityId || apiResponse._id || apiResponse.id || null;
            entityName = auditObj.entityName || apiResponse.name || apiResponse.code || apiResponse.voucherCode || null;

            if (before && after) {
              diff = this.calculateDiff(before, after);
            }
          } else {
            after = apiResponse;
            entityId = apiResponse._id || apiResponse.id || entityId;
            entityName = apiResponse.name || apiResponse.code || apiResponse.voucherCode || null;
            entityVersion = apiResponse.__v || apiResponse.entityVersion || null;
          }
        }

        // Limit diff size to 64KB. If exceeded, truncate and note in summary
        let summary = '';
        if (diff) {
          const diffStr = JSON.stringify(diff);
          if (Buffer.byteLength(diffStr) > 64 * 1024) {
            diff = null;
            summary = 'Large payload diff omitted (exceeded 64KB)';
          } else {
            summary = `${actionName} thành công.`;
          }
        } else {
          summary = error ? `Thao tác thất bại: ${error.message}` : `${actionName} thành công.`;
        }

        const logPayload = {
          auditEventId: randomUUID(),
          correlationId,
          requestId,
          sessionId,
          userId,
          username: email,
          role,
          branchId,
          module,
          actionCode,
          actionName,
          eventType,
          entityType,
          entityId,
          entityName,
          entityVersion,
          diff,
          summary,
          payload: {
            body: this.redactionService.mask(request.body),
            query: this.redactionService.mask(request.query),
            params: this.redactionService.mask(request.params),
          },
          endpoint: request.url,
          method: request.method,
          ip,
          userAgent,
          browser,
          os,
          device,
          status: error ? 'FAILED' : 'SUCCESS',
          severity,
          error: error ? (error.stack || error.message) : null,
          createdAt: new Date().toISOString(),
        };

        // Fire-and-forget publish to Kafka topic
        try {
          await this.userClient.emit('audit.created', logPayload).toPromise();
        } catch (kafkaError: any) {
          // If Kafka is offline, buffer to Redis Fallback Queue
          await this.fallbackProcessor.pushToFallback(logPayload);
        }
      } catch (logErr: any) {
        this.logger.error('Failed to assemble and trigger audit log', logErr);
      }
    }, 0);
  }

  private calculateDiff(before: any, after: any): any {
    if (!before || !after || typeof before !== 'object' || typeof after !== 'object') {
      return null;
    }
    const diff = {};
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const skipKeys = new Set(['password', 'passwordHash', 'token', 'apiKey', 'otp', 'updatedAt', 'createdAt', '__v']);

    for (const key of allKeys) {
      if (skipKeys.has(key)) continue;
      const valBefore = before[key];
      const valAfter = after[key];

      if (JSON.stringify(valBefore) !== JSON.stringify(valAfter)) {
        diff[key] = {
          before: valBefore !== undefined ? valBefore : null,
          after: valAfter !== undefined ? valAfter : null,
        };
      }
    }
    return Object.keys(diff).length > 0 ? diff : null;
  }

  private parseUserAgent(ua: string) {
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop';

    // Parse OS
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/linux/i.test(ua)) os = 'Linux';

    // Parse Browser
    if (/edg/i.test(ua)) browser = 'Edge';
    else if (/opr/i.test(ua)) browser = 'Opera';
    else if (/chrome/i.test(ua)) browser = 'Chrome';
    else if (/safari/i.test(ua)) browser = 'Safari';
    else if (/firefox/i.test(ua)) browser = 'Firefox';

    // Parse Device
    if (/mobi|tablet/i.test(ua)) {
      device = /tablet/i.test(ua) ? 'Tablet' : 'Mobile';
    }

    return { browser, os, device };
  }

  private getFallbackActionName(method: string, url: string): string {
    const isPost = method === 'POST';
    const isPutPatch = ['PUT', 'PATCH'].includes(method);
    const isDelete = method === 'DELETE';

    if (url.includes('/api/goods-receipts')) {
      if (url.endsWith('/approve')) return 'Phê duyệt phiếu nhập kho';
      if (url.endsWith('/reject')) return 'Từ chối phiếu nhập kho';
      if (isPost) return 'Tạo phiếu nhập kho';
      return 'Cập nhật phiếu nhập kho';
    }
    if (url.includes('/api/vouchers')) {
      if (isPost) return 'Tạo Voucher khuyến mãi';
      if (isDelete) return 'Xóa Voucher khuyến mãi';
      return 'Cập nhật Voucher khuyến mãi';
    }
    if (url.includes('/api/branches')) {
      if (isPost) return 'Tạo chi nhánh';
      return 'Cập nhật chi nhánh';
    }
    if (url.includes('/api/medicines')) {
      if (url.endsWith('/price-tiers')) return 'Cập nhật giá sỉ thuốc';
      if (url.endsWith('/status')) return 'Cập nhật trạng thái thuốc';
      return 'Cập nhật danh mục thuốc';
    }
    if (url.includes('/api/sales')) return 'Bán thuốc tại quầy';
    if (url.includes('/api/users/profile')) return 'Cập nhật hồ sơ cá nhân';
    if (url.includes('/api/users/avatar')) return 'Cập nhật ảnh đại diện';

    return `${method} ${url}`;
  }

  private getFallbackModule(url: string): string {
    if (url.includes('/api/goods-receipts') || url.includes('/api/inventory-checks') || url.includes('/api/medicines')) return 'Inventory';
    if (url.includes('/api/vouchers')) return 'Voucher';
    if (url.includes('/api/branches')) return 'Branch';
    if (url.includes('/api/sales') || url.includes('/api/orders')) return 'Sales';
    if (url.includes('/api/auth') || url.includes('/api/users')) return 'Auth';
    return 'System';
  }

  private getFallbackEventType(method: string): string {
    if (method === 'POST') return 'CREATE';
    if (['PUT', 'PATCH'].includes(method)) return 'UPDATE';
    if (method === 'DELETE') return 'DELETE';
    return 'READ';
  }
}
