import { Controller, Post, Get, Patch, Query, Param, Body, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';

@Controller('api/purchase-requisitions')
export class PurchaseRequisitionController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.pr.create',
      'inventory.pr.list',
      'inventory.pr.get_by_id',
      'inventory.pr.process_urgent',
    ]);
  }

  /**
   * BƯỚC 1: Chi nhánh tạo yêu cầu mua hàng (PR)
   */
  @Post()
  async createPurchaseRequisition(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.pr.create', data);
  }

  /**
   * Danh sách PR (filter bằng ?status=SUBMITTED hoặc ?branchId=xxx)
   */
  @Get()
  async listPurchaseRequisitions(@Query('status') status?: string, @Query('branchId') branchId?: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.pr.list', { status, branchId });
  }

  /**
   * Chi tiết PR theo ID
   */
  @Get(':id')
  async getPurchaseRequisitionById(@Param('id') id: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.pr.get_by_id', { id });
  }



  @Post('process-urgent')
  async processUrgentPurchaseRequisitions(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.pr.process_urgent', data);
  }
}
