import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { InventoryServiceModule } from './inventory-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    InventoryServiceModule,
    {
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'inventory-service',
          brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
          connectionTimeout: 10000,
          retry: { initialRetryTime: 1000, retries: 10 },
        },
        consumer: {
          groupId: (process.env.KAFKA_GROUP_ID || 'wdp301-consumers') + '-inventory',
        },
      },
    },
  );

  await app.listen();
  console.log('🚀 Inventory Microservice đang lắng nghe Kafka trên localhost:9092');
}

bootstrap();
