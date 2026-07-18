import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import Redis from 'ioredis';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AuditFallbackProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuditFallbackProcessor.name);
  private redis: Redis;
  private retryInterval: NodeJS.Timeout;
  private isProcessing = false;
  private kafkaClient: ClientKafka;

  constructor() {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = Number(process.env.REDIS_PORT) || 6379;
    this.redis = new Redis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: 3,
    });
    
    this.redis.on('error', (err) => {
      this.logger.error(`Redis client error: ${err.message}`);
    });
  }

  setKafkaClient(client: ClientKafka) {
    this.kafkaClient = client;
  }

  onModuleInit() {
    // Check and process fallback queue every 10 seconds
    this.retryInterval = setInterval(() => {
      this.processFallbackQueue().catch((err) => {
        this.logger.error('Error in processFallbackQueue loop', err);
      });
    }, 10000);
  }

  onModuleDestroy() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }
    this.redis.disconnect();
  }

  async getQueueSize(): Promise<number> {
    try {
      return await this.redis.llen('audit_fallback_queue');
    } catch (e) {
      return 0;
    }
  }

  async getDlqSize(): Promise<number> {
    try {
      return await this.redis.llen('audit_log_dlq');
    } catch (e) {
      return 0;
    }
  }

  async pushToFallback(log: any) {
    try {
      const fallbackPayload = {
        log,
        retries: 0,
        lastAttempt: new Date().toISOString(),
      };
      await this.redis.rpush('audit_fallback_queue', JSON.stringify(fallbackPayload));
      this.logger.warn(`Kafka emit failed. Buffered log to Redis Fallback Queue (auditEventId: ${log.auditEventId})`);
    } catch (redisError: any) {
      this.logger.error(`Redis is also unavailable! Falling back to local file. Error: ${redisError.message}`);
      this.writeToLocalLog(log);
    }
  }

  private writeToLocalLog(log: any) {
    try {
      const logsDir = path.resolve(process.cwd(), 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      const logFilePath = path.join(logsDir, 'audit-critical.log');
      const logLine = JSON.stringify({
        ...log,
        _criticalError: 'Kafka and Redis both unavailable. Logged to local fallback file.',
        loggedAt: new Date().toISOString(),
      }) + '\n';

      // Rotated local file logic (max 100MB, keeps up to 10 rotated log files)
      if (fs.existsSync(logFilePath)) {
        const stats = fs.statSync(logFilePath);
        if (stats.size > 100 * 1024 * 1024) { // 100MB limit
          for (let i = 9; i >= 1; i--) {
            const oldFile = path.join(logsDir, `audit-critical.${i}.log`);
            const targetFile = path.join(logsDir, `audit-critical.${i + 1}.log`);
            if (fs.existsSync(oldFile)) {
              fs.renameSync(oldFile, targetFile);
            }
          }
          fs.renameSync(logFilePath, path.join(logsDir, 'audit-critical.1.log'));
        }
      }
      
      fs.appendFileSync(logFilePath, logLine, 'utf8');
      this.logger.error(`CRITICAL: Audit log written to local file fallback: ${logFilePath}`);
    } catch (fileError: any) {
      console.error('FATAL: Could not write fallback log to file system either!', fileError);
    }
  }

  private async processFallbackQueue() {
    if (this.isProcessing || !this.kafkaClient) return;
    this.isProcessing = true;

    try {
      let queueLen = await this.redis.llen('audit_fallback_queue');
      while (queueLen > 0) {
        const itemStr = await this.redis.lindex('audit_fallback_queue', 0);
        if (!itemStr) break;

        const payload = JSON.parse(itemStr);
        const { log, retries } = payload;

        try {
          // Attempt to emit via Kafka
          await this.kafkaClient.emit('audit.created', log).toPromise();
          
          // If successful, remove from queue
          await this.redis.lpop('audit_fallback_queue');
          this.logger.log(`Resent fallback log to Kafka successfully (auditEventId: ${log.auditEventId})`);
          queueLen--;
        } catch (kafkaErr: any) {
          this.logger.warn(`Resend retry ${retries + 1} failed for log ${log.auditEventId}: ${kafkaErr.message}`);
          
          if (retries >= 4) {
            // Max retries (5 attempts) reached -> Move to DLQ
            await this.redis.lpop('audit_fallback_queue');
            payload.dlqError = kafkaErr.message;
            payload.failedAt = new Date().toISOString();
            await this.redis.rpush('audit_log_dlq', JSON.stringify(payload));
            this.logger.error(`CRITICAL: Audit log reached max retries. Moved to DLQ 'audit_log_dlq' (auditEventId: ${log.auditEventId})`);
          } else {
            // Update retry count and shift element to the back of the queue
            payload.retries = retries + 1;
            payload.lastAttempt = new Date().toISOString();
            await this.redis.lpop('audit_fallback_queue');
            await this.redis.rpush('audit_fallback_queue', JSON.stringify(payload));
          }
          break; // Exit this processing cycle to wait for the next backoff interval
        }
      }
    } catch (e: any) {
      this.logger.error(`Error processing fallback queue: ${e.message}`);
    } finally {
      this.isProcessing = false;
    }
  }
}
