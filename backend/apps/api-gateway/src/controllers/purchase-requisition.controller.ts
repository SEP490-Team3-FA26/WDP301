import { Controller, Post, Get, Patch, Query, Param, Body, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuditLogAction } from '../decorators/audit-log.decorator';

@Controller('api/purchase-requisitions')
@UseGuards(JwtAuthGuard)
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
  @AuditLogAction({
    actionCode: 'PR_CREATE',
    actionName: 'Tạo yêu cầu mua hàng',
    module: 'Purchase',
    eventType: 'CREATE',
    entityType: 'PurchaseRequisition',
  })
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
  @AuditLogAction({
    actionCode: 'PR_PROCESS_URGENT',
    actionName: 'Xử lý yêu cầu mua hàng khẩn cấp',
    module: 'Purchase',
    eventType: 'APPROVE',
    entityType: 'PurchaseRequisition',
  })
  async processUrgentPurchaseRequisitions(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.pr.process_urgent', data);
  }
}
