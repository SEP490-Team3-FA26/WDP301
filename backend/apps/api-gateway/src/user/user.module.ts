import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UserController } from './user.controller';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'USER_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'api-gateway-user-client',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            connectionTimeout: 10000,
            retry: { initialRetryTime: 1000, retries: 10 },
          },
          consumer: {
            groupId: 'api-gateway-user-group',
          },
          producer: { allowAutoTopicCreation: true },
        },
      },
    ]),
  ],
  controllers: [UserController],
})
export class UserModule {}
