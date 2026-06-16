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
      'inventory.pr.consolidate',
      'inventory.pr.approve',
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

  /**
   * BƯỚC 2a: Quản lý kho gom đơn (Consolidate)
   * Body: { prIds: ['id1', 'id2', ...], consolidatedBy?: 'user_id' }
   */
  @Post('consolidate')
  async consolidatePurchaseRequisitions(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.pr.consolidate', data);
  }

  /**
   * BƯỚC 2b: HQ phê duyệt / từ chối
   * Body: { prIds: ['id1', 'id2'], action: 'APPROVE' | 'REJECT', approvedBy?: 'user_id', rejectionReason?: '...' }
   */
  @Post('approve')
  async approvePurchaseRequisitions(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.pr.approve', data);
  }
}
