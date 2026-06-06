import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryServiceController } from './inventory-service.controller';
import { InventoryServiceService } from './inventory-service.service';
import { ProductModule } from './product/product.module';
import { PurchaseOrder, PurchaseOrderSchema } from './purchase-order.schema';
import { MedicineSchema } from '../../api-gateway/src/medicine/medicine.schema';

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
      { name: PurchaseOrder.name, schema: PurchaseOrderSchema },
      { name: 'Medicine', schema: MedicineSchema }
    ]),
    ClientsModule.register([
      {
        name: 'SUPPLIER_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'inventory-supplier-client',
            brokers: ['localhost:9092'],
          },
          consumer: {
            groupId: 'inventory-supplier-group',
          },
        },
      },
    ]),
    ProductModule,
  ],
  controllers: [InventoryServiceController],
  providers: [InventoryServiceService],
})
export class InventoryServiceModule {}
