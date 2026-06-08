import { NestFactory } from '@nestjs/core';
import { SupplierServiceModule } from './supplier-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(SupplierServiceModule);
  
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      },
      consumer: {
        groupId: 'supplier-consumer-group',
      },
    },
  });

  await app.startAllMicroservices();
  console.log('Supplier Microservice đang lắng nghe Kafka trên localhost:9092');
}
bootstrap();
