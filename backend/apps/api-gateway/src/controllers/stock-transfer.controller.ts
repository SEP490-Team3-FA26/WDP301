import { Controller, Post, Get, Param, Body, Query, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';

@Controller('api/stock-transfers')
export class StockTransferController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.transfer.create',
      'inventory.transfer.receive',
      'inventory.transfer.list',
      'inventory.transfer.get_by_id',
    ]);
  }

  @Post()
  async createStockTransfer(@Body() data: { prId: string; shippedBy: string }) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.transfer.create', data);
  }

  @Post(':id/receive')
  async confirmStockTransferReceipt(
    @Param('id') id: string,
    @Body() body: { receivedBy: string },
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.transfer.receive', {
      transferId: id,
      receivedBy: body.receivedBy,
    });
  }

  @Get()
  async listStockTransfers(
    @Query('status') status?: string,
    @Query('toBranchId') toBranchId?: string,
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.transfer.list', {
      status,
      toBranchId,
    });
  }

  @Get(':id')
  async getStockTransferById(@Param('id') id: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.transfer.get_by_id', { id });
  }
}
