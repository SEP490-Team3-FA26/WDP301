import { NestFactory } from '@nestjs/core';
import { SupplierServiceModule } from './supplier-service.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(SupplierServiceModule);
  
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        brokers: ['localhost:9092'],
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
