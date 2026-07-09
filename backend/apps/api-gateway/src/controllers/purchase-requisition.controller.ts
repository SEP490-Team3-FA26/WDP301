import { Controller, Post, Get, Patch, Query, Param, Body, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { AppWebsocketGateway } from '../websocket/websocket.gateway';

@Controller('api/purchase-requisitions')
export class PurchaseRequisitionController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    private readonly websocketGateway: AppWebsocketGateway,
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
    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.pr.create', data);
    
    console.log('📋 PR Created - Full Result:', JSON.stringify(result, null, 2));
    
    // Emit notification to admin room
    if (result && this.websocketGateway.server) {
      const notificationPayload = {
        type: 'NEW_PR',
        prId: result._id || result.id,
        prCode: result.prCode || 'PR-UNKNOWN',
        branchName: result.branchName || data.branchName || 'Chi nhánh không rõ',
        branchId: result.branchId || data.branchId,
        itemsCount: result.items?.length || data.items?.length || 0,
        createdAt: result.createdAt || new Date().toISOString(),
        createdBy: data.createdBy || result.createdBy || 'Chi nhánh',
        message: `${result.branchName || data.branchName || 'Chi nhánh'} vừa tạo yêu cầu nhập hàng ${result.prCode || 'PR-???'}`,
        timestamp: new Date().toISOString(),
      };
      
      console.log('🔔 Emitting notification:', notificationPayload);
      this.websocketGateway.server.to('admin').emit('new_pr_notification', notificationPayload);
    }
    
    return result;
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
    if (this.websocketGateway.server) {
      this.websocketGateway.server.emit('pr_updated', { id, status: data.status });
    }
    
    return result;
  }
}
