import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { User, UserSchema } from '../../auth-service/src/auth/user.schema';
import { UserServiceController } from './user-service.controller';
import { UserService } from './user-service.service';
import { Branch, BranchSchema } from './schemas/branch.schema';
import { BranchService } from './branch.service';
import { Cart, CartSchema } from './schemas/cart.schema';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Cart.name, schema: CartSchema },
    ]),
    ClientsModule.registerAsync([
      {
        name: 'INVENTORY_SERVICE',
        imports: [ConfigModule],
        useFactory: async (config: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'user-service-inventory-client',
              brokers: (config.get<string>('KAFKA_BROKERS') || 'localhost:9092').split(','),
              connectionTimeout: 10000,
              retry: { initialRetryTime: 1000, retries: 10 },
              logLevel: 0,
            },
            consumer: { groupId: 'user-service-inventory-group' },
            producer: { allowAutoTopicCreation: true },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [UserServiceController],
  providers: [UserService, BranchService],
})
export class UserServiceModule {}


