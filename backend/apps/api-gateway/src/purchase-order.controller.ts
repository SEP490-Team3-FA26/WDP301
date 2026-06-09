import { Controller, Post, Get, Query, Param, Body, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from './common/kafka.helper';

@Controller('api/purchase-orders')
export class PurchaseOrderController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.po.create',
      'inventory.po.list',
      'inventory.po.get_by_id',
    ]);
  }

  @Post()
  async createPurchaseOrder(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.create', data);
  }

  @Get()
  async listPurchaseOrders(@Query('status') status?: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.list', { status });
  }

  @Get(':id')
  async getPurchaseOrderById(@Param('id') id: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.get_by_id', { id });
  }
}
