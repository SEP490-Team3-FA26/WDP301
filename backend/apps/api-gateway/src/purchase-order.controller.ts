import { Controller, Post, Body, Inject, OnModuleInit, HttpException, HttpStatus } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from './common/kafka.helper';
@Controller('api/purchase-orders')
export class PurchaseOrderController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, ['inventory.po.create']);
  }

  @Post()
  async createPurchaseOrder(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.create', data);
  }
}
