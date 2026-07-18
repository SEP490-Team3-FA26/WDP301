import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { QuotaController } from './quota.controller';
import { QuotaService } from './quota.service';
import { Quota, QuotaSchema } from './schemas/quota.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Quota.name, schema: QuotaSchema }]),
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'inventory-user-client',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            connectionTimeout: 10000,
            retry: { initialRetryTime: 1000, retries: 10 },
            logLevel: 0,
          },
          consumer: {
            groupId: 'inventory-user-group',
          },
        },
      },
    ]),
  ],
  controllers: [QuotaController],
  providers: [QuotaService],
  exports: [QuotaService],
})
export class QuotaModule {}

