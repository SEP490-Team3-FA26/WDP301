import { Controller, Post, Get, Body, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from './common/kafka.helper';

@Controller('api/goods-receipts')
export class GoodsReceiptController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.grn.create',
      'inventory.grn.list',
    ]);
  }

  @Post()
  async createGoodsReceiptNote(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.grn.create', data);
  }

  @Get()
  async listGoodsReceiptNotes() {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.grn.list', {});
  }
}
