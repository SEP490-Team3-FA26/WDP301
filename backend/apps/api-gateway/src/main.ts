import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppGatewayModule } from './app.module';
import { Request, Response } from 'express';
import { AuditFallbackProcessor } from './processors/audit-fallback.processor';
import { Transport } from '@nestjs/microservices';
import { exec } from 'child_process';
import * as os from 'os';

function checkDiskSpace(): Promise<boolean> {
  return new Promise((resolve) => {
    const isWin = os.platform() === 'win32';
    const cmd = isWin ? 'wmic logicaldisk get freespace' : 'df -B1 .';
    exec(cmd, (err, stdout) => {
      if (err) {
        resolve(true); // default to ok to avoid false-positives
        return;
      }
      try {
        if (isWin) {
          const lines = stdout.trim().split('\r\n').filter(l => l.trim().length > 0);
          // The output format is:
          // FreeSpace
          // 418182772736
          // Skip header and find number
          const freeBytes = Number(lines[1]?.trim());
          resolve(isNaN(freeBytes) || freeBytes > 500 * 1024 * 1024); // > 500MB free space
        } else {
          const lines = stdout.trim().split('\n');
          const cols = lines[1]?.split(/\s+/);
          const freeBytes = Number(cols[3]); // Available column
          resolve(isNaN(freeBytes) || freeBytes > 500 * 1024 * 1024);
        }
      } catch (e) {
        resolve(true);
      }
    });
  });
}

async function bootstrap() {
  process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';
  let retries = 10;
  while (retries > 0) {
    try {
      const app = await NestFactory.create(AppGatewayModule, {
        logger: ['error', 'warn'], // Chỉ log error, warn
      });

      // Connect Kafka microservice listener to consume broadcast events (like audit.persisted)
      app.connectMicroservice({
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'api-gateway-listener',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            connectionTimeout: 10000,
            retry: { initialRetryTime: 1000, retries: 10 },
          },
          consumer: {
            groupId: 'api-gateway-listener-group',
          },
        },
      });

      await app.startAllMicroservices();

      // Global Validation Pipe — tự động validate DTO bằng class-validator
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,     // Bỏ qua các field không khai báo trong DTO
          transform: true,     // Tự động convert kiểu dữ liệu
          forbidNonWhitelisted: true, // Trả lỗi nếu client gửi thêm field lạ
        }),
      );

      // CORS — Cho phép Frontend gọi API (Động để hỗ trợ Flutter Web / React Web) (wildcard trong K8s)
      app.enableCors({
        origin: (origin, callback) => {
          // Cho phép mọi origin gửi request đến (hoặc có thể kiểm tra cụ thể origin)
          // Trong môi trường dev, phản hồi trực tiếp origin của client để tránh lỗi CORS
          callback(null, true);
        },
        credentials: true,
      });

      // ─── Health Check Endpoints (v5) ─────────────────────────────
      const expressApp = app.getHttpAdapter().getInstance();
      const path = require('path');
      const express = require('express');
      expressApp.use('/public', express.static(path.join(process.cwd(), 'public')));
      
      // Legacy health check
      expressApp.get('/health', (_req: Request, res: Response) => {
        res.status(200).json({
          status: 'ok',
          service: 'api-gateway',
          version: process.env.APP_VERSION || '1.0.0',
          timestamp: new Date().toISOString(),
        });
      });

      // Liveness Probe - checks if API Gateway process is active
      expressApp.get('/health/live', (_req: Request, res: Response) => {
        res.status(200).json({
          status: 'ok',
          service: 'api-gateway',
          timestamp: new Date().toISOString(),
        });
      });

      // Readiness Probe - checks critical infrastructure dependencies & disk capacity
      expressApp.get('/health/ready', async (_req: Request, res: Response) => {
        try {
          const fallbackProcessor = app.get(AuditFallbackProcessor);
          const queueSize = await fallbackProcessor.getQueueSize();
          const dlqSize = await fallbackProcessor.getDlqSize();
          const diskOk = await checkDiskSpace();

          // Readiness fails if disk space is critical or fallback queue overflows (>1000 items)
          const isReady = diskOk && queueSize < 1000;

          res.status(isReady ? 200 : 503).json({
            status: isReady ? 'ready' : 'not_ready',
            checks: {
              redisFallbackQueue: queueSize,
              redisDlq: dlqSize,
              diskSpace: diskOk ? 'ok' : 'low',
            },
            timestamp: new Date().toISOString(),
          });
        } catch (err: any) {
          res.status(500).json({
            status: 'error',
            message: err.message,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Swagger API Documentation
      const config = new DocumentBuilder()
        .setTitle('WDP301 API Gateway')
        .setDescription('🏥 Hệ thống quản lý chuỗi nhà thuốc WDP301 — API Documentation')
        .setVersion('1.0')
        .addBearerAuth()  // Thêm nút "Authorize" trên Swagger UI để test JWT
        .addTag('🔐 Authentication', 'Đăng nhập, Đăng ký, Đăng xuất')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document);

      const port = process.env.PORT || 4000;
      
      // Khởi tạo Kafka Consumer cho API Gateway
      app.connectMicroservice({
        transport: Transport.KAFKA,
        options: {
          client: {
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
          },
          consumer: {
            groupId: 'api-gw-events-consumer',
          },
        },
      });
      await app.startAllMicroservices();
      
      await app.listen(port);
      console.log(`\n🚀 API Gateway running at: http://localhost:${port}`);
      console.log(`📚 Swagger Docs at:        http://localhost:${port}/api/docs\n`);
      break;
    } catch (err) {
      console.error(`❌ Lỗi khởi động API Gateway. Thử lại sau 5s... (${retries} lần thử còn lại)`, err);
      retries--;
      if (retries === 0) throw err;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

bootstrap();
