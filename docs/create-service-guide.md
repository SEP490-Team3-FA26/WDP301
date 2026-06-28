# Tạo Microservice Mới (Kafka)

## 1. Generate Service
```bash
cd backend
nest generate app <service-name> # VD: orders-service
```

## 2. Config Kafka (main.ts)
Sửa `apps/<service-name>/src/main.ts`:
```typescript
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module'; 

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.KAFKA,
    options: {
      client: { brokers: [process.env.KAFKA_BROKERS || 'localhost:9092'] },
      consumer: { groupId: '<service-name>-group' }, // BẮT BUỘC KHÁC NHAU cho mỗi service
    },
  });
  await app.listen();
}
bootstrap();
```

## 3. Lắng nghe Message (Controller)
Bỏ `@Get/@Post`, dùng `@MessagePattern`:
```typescript
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class AppController {
  @MessagePattern('action_name') // VD: 'create_order'
  handleAction(@Payload() data: any) {
    return { status: 'success', data }; 
  }
}
```

## 4. Đăng ký ở API Gateway
Thêm vào `imports` tại module của Gateway (`apps/api-gateway/...`):
```typescript
import { ClientsModule, Transport } from '@nestjs/microservices';

ClientsModule.register([{
  name: 'SERVICE_TOKEN', // VD: 'ORDERS_SERVICE'
  transport: Transport.KAFKA,
  options: {
    client: { brokers: ['localhost:9092'] },
    consumer: { groupId: 'api-gateway-consumer' },
  },
}])
```

## 5. Gọi Service từ API Gateway
Tại Controller của Gateway:
```typescript
import { Controller, Post, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

@Controller('endpoint')
export class GatewayController implements OnModuleInit {
  constructor(@Inject('SERVICE_TOKEN') private client: ClientKafka) {}

  async onModuleInit() {
    this.client.subscribeToResponseOf('action_name'); // Quan trọng
    await this.client.connect();
  }

  @Post()
  callService() {
    // Trả về dữ liệu từ Microservice
    return this.client.send('action_name', { payload: 'data' });
  }
}
```
