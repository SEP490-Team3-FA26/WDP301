import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppGatewayModule } from './app.module';
import { Request, Response } from 'express';

async function bootstrap() {
  process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';
  let retries = 10;
  while (retries > 0) {
    try {
      const app = await NestFactory.create(AppGatewayModule, {
        logger: ['error', 'warn'], // Chỉ log error, warn
      });

  // Global Validation Pipe — tự động validate DTO bằng class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,     // Bỏ qua các field không khai báo trong DTO
      transform: true,     // Tự động convert kiểu dữ liệu
      forbidNonWhitelisted: true, // Trả lỗi nếu client gửi thêm field lạ
    }),
  );

  // CORS — Cho phép Frontend gọi API (Động để hỗ trợ Flutter Web / React Web)
  app.enableCors({
    origin: (origin, callback) => {
      // Cho phép mọi origin gửi request đến (hoặc có thể kiểm tra cụ thể origin)
      // Trong môi trường dev, phản hồi trực tiếp origin của client để tránh lỗi CORS
      callback(null, true);
    },
    credentials: true,
  });

  // ─── Health Check Endpoint ───────────────────────────────────
  // Kubernetes liveness & readiness probe cần endpoint này trả 200
  // Nếu thiếu → probe trả 404 → K8s kill pod liên tục → CPU spike 98%
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'api-gateway',
      version: process.env.APP_VERSION || '1.0.0',
      timestamp: new Date().toISOString(),
    });
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
