import { Controller, Post, Get, Query, Param, Body, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { AppWebsocketGateway } from '../websocket/websocket.gateway';
import { NotificationService } from '../notification/notification.service';

@Controller('api/purchase-orders')
export class PurchaseOrderController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    private readonly websocketGateway: AppWebsocketGateway,
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.po.auto_route',
      'inventory.po.approve_pay',
      'inventory.po.reject_delivery',
      'inventory.po.list',
      'inventory.po.get_by_id',
      'inventory.po.receive',
    ]);
  }



  @Post('auto-route')
  async createAutoRoutedPurchaseOrders(@Body() data: any) {
    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.po.auto_route', data);
    
    console.log('📦 PO Created - Full Result:', JSON.stringify(result, null, 2));
    
    // Handle nested response
    const poData = result.data || result;
    
    // Emit notification to admin ONLY (not warehouse)
    // Warehouse tạo PO → Admin nhận notification
    if (this.websocketGateway.server && poData) {
      // Handle both single PO and array of POs
      const pos = Array.isArray(poData) ? poData : [poData];
      
      pos.forEach(po => {
        // Debug log để check items
        console.log('📦 PO Items:', po.items);
        console.log('📦 Items Count:', po.items?.length);
        
        const itemsCount = po.items?.length || 0;
        
        const notificationPayload = {
          type: 'NEW_PO',
          poId: po._id || po.id,
          supplierId: po.supplierId,
          supplierName: po.supplierName || 'Nhà cung cấp',
          itemsCount: itemsCount,
          totalAmount: po.totalAmount || 0,
          linkedPrId: po.linkedPrId,
          message: `Đơn đặt hàng mới đã được tạo cho ${po.supplierName || 'nhà cung cấp'} (${itemsCount} sản phẩm)`,
          timestamp: new Date().toISOString(),
        };
        
        console.log('📦 Emitting NEW_PO notification to ADMIN only:', notificationPayload);
        // Chỉ gửi cho admin, KHÔNG gửi warehouse
        this.websocketGateway.server.to('admin').emit('new_po_notification', notificationPayload);
        
        // Persist to DB
        this.notificationService.create({
          type: 'NEW_PO',
          targetRooms: ['admin'],
          message: notificationPayload.message,
          poId: notificationPayload.poId,
          supplierName: notificationPayload.supplierName,
          itemsCount: notificationPayload.itemsCount,
          totalAmount: notificationPayload.totalAmount,
        }).catch(err => console.error('Failed to persist NEW_PO notification:', err));
      });
    }
    
    return result;
  }

  @Post('approve-pay')
  async approveAndPayPurchaseOrder(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.approve_pay', data);
  }

  @Post('reject-delivery')
  async rejectPurchaseOrderDelivery(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.reject_delivery', data);
  }

  @Get()
  async listPurchaseOrders(@Query('status') status?: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.list', { status });
  }

  @Get(':id')
  async getPurchaseOrderById(@Param('id') id: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.get_by_id', { id });
  }

  @Post(':id/receive')
  async receivePurchaseOrder(@Param('id') id: string, @Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.receive', { id, ...data });
  }
}
