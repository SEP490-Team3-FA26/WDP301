import { Controller, Post, Get, Param, Body, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { AppWebsocketGateway } from '../websocket/websocket.gateway';

@Controller('api/goods-receipts')
export class GoodsReceiptController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    private readonly websocketGateway: AppWebsocketGateway,
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
    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.grn.create', data);
    
    // Handle nested response
    const grnData = result.data || result;
    
    // Emit notification to admin and warehouse
    if (this.websocketGateway.server && grnData) {
      const notificationPayload = {
        type: 'GRN_COMPLETED',
        grnId: grnData._id || grnData.id,
        poId: grnData.poId,
        itemsCount: grnData.items?.length || 0,
        totalAmount: grnData.totalAmount || 0,
        receivedBy: data.receivedBy || grnData.receivedBy || 'Kho',
        message: `Đã nhập kho thành công ${grnData.items?.length || 0} loại thuốc`,
        timestamp: new Date().toISOString(),
      };
      
      console.log('📥 Emitting GRN completed notification:', notificationPayload);
      this.websocketGateway.server.to('admin').emit('grn_completed_notification', notificationPayload);
      this.websocketGateway.server.to('warehouse').emit('grn_completed_notification', notificationPayload);
      
      // Also notify the branch that requested (if linked to PR)
      if (grnData.linkedPrId || data.branchId) {
        const branchId = data.branchId || grnData.branchId;
        if (branchId) {
          const branchNotification = {
            ...notificationPayload,
            message: `Hàng đã nhập kho: ${grnData.items?.length || 0} loại thuốc`,
          };
          this.websocketGateway.server.to(`branch-${branchId}`).emit('grn_completed_notification', branchNotification);
        }
      }
    }
    
    return result;
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
