import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { OrdersServiceModule } from './orders-service.module';

async function bootstrap() {
  process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';
  let retries = 20;
  while (retries > 0) {
    try {
      console.log('🔄 Đang kết nối tới Kafka (Orders-Service)...');
      const app = await NestFactory.createMicroservice<MicroserviceOptions>(
        OrdersServiceModule,
        {
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'orders-service',
              brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
              connectionTimeout: 10000,
              retry: { initialRetryTime: 1000, retries: 10 },
              logLevel: 0,
            },
            consumer: {
              groupId: (process.env.KAFKA_GROUP_ID || 'wdp301-consumers') + '-orders',
            },
            producer: {
              maxInFlightRequests: 1,
            },
            subscribe: {
              allowAutoTopicCreation: true,
            },
          } as any,
          logger: ['log', 'error', 'warn'],
        },
      );

      await app.listen();
      console.log('🚀 Orders Microservice khởi động thành công!');
      break;
    } catch (error) {
      console.log('🔄 Kafka chưa sẵn sàng cho Orders-Service, đang thử lại sau 5s...');
      retries--;
      if (retries === 0) throw error;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

bootstrap();
