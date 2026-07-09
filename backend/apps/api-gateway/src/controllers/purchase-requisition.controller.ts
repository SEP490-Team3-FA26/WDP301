import { Controller, Post, Get, Patch, Query, Param, Body, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { SocketGateway } from '../socket/socket.gateway';

@Controller('api/purchase-requisitions')
export class PurchaseRequisitionController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    private readonly socketGateway: SocketGateway,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.pr.create',
      'inventory.pr.list',
      'inventory.pr.get_by_id',
      'inventory.pr.process_urgent',
      'inventory.pr.update_status',
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

  @Patch(':id/status')
  async updatePurchaseRequisitionStatus(@Param('id') id: string, @Body() data: { status: string }) {
    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.pr.update_status', { id, status: data.status });
    
    // Broadcast real-time event to all connected frontend clients
    if (this.socketGateway.server) {
      this.socketGateway.server.emit('pr_updated', { id, status: data.status });
    }
    
    return result;
  }
}
