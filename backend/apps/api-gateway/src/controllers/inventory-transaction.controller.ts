import { Controller, Get, Query, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';

@Controller('api/inventory-transactions')
export class InventoryTransactionController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.transactions.list',
    ]);
  }

  /**
   * Nhật ký biến động kho
   * Query params: ?type=GRN_IMPORT&medicineId=xxx&page=1&limit=50
   */
  @Get()
  async listInventoryTransactions(
    @Query('type') type?: string,
    @Query('medicineId') medicineId?: string,
    @Query('referenceType') referenceType?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.transactions.list', {
      type,
      medicineId,
      referenceType,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }
}
