import { NestFactory } from '@nestjs/core';
import { SupplierServiceModule } from './supplier-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';
  let retries = 10;
  while (retries > 0) {
    try {
      console.log('🔄 Đang kết nối tới Kafka...');
      const app = await NestFactory.create(SupplierServiceModule, { logger: ['error', 'warn'] });

      app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.KAFKA,
        options: {
          client: {
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            connectionTimeout: 10000,
            retry: { initialRetryTime: 1000, retries: 10 },
            logLevel: 0,
          },
          consumer: {
            groupId: 'supplier-consumer-group',
          },
          subscribe: {
            allowAutoTopicCreation: true,
          },
        } as any,
      });

      await app.startAllMicroservices();
      console.log('🚀 Supplier Microservice khởi động thành công!');
      break;
    } catch (err) {
      console.log('🔄 Kafka chưa sẵn sàng, đang thử lại sau 5s...');
      retries--;
      if (retries === 0) throw err;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
bootstrap();
