import { Controller, Get, Query, Inject, OnModuleInit, Param } from '@nestjs/common';
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
      'inventory.transactions.trace',
      'inventory.reports.import_export',
    ]);
  }

  @Get('report')
  async getImportExportReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.reports.import_export', {
      startDate,
      endDate,
    });
  }

  @Get('trace/:batchNo')
  async traceLot(@Param('batchNo') batchNo: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.transactions.trace', {
      batchNo,
    });
  }

  /**
   * Nhật ký biến động kho
   * Query params: ?type=GRN_IMPORT&medicineId=xxx&page=1&limit=50&batchNo=xxx
   */
  @Get()
  async listInventoryTransactions(
    @Query('type') type?: string,
    @Query('medicineId') medicineId?: string,
    @Query('referenceType') referenceType?: string,
    @Query('batchNo') batchNo?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.transactions.list', {
      type,
      medicineId,
      referenceType,
      batchNo,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }
}
