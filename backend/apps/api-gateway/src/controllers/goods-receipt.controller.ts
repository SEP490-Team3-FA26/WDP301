import { Controller, Post, Get, Param, Body, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';

@Controller('api/goods-receipts')
export class GoodsReceiptController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.grn.create',
      'inventory.grn.list',
      'inventory.grn.get_by_id',
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

  @Get(':id')
  async getGoodsReceiptNoteById(@Param('id') id: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.grn.get_by_id', { id });
  }
}
