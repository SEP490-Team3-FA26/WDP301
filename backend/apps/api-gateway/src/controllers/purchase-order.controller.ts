import { Controller, Post, Get, Query, Param, Body, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { AppWebsocketGateway } from '../websocket/websocket.gateway';
import { NotificationService } from '../notification/notification.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuditLogAction } from '../decorators/audit-log.decorator';
import { AutoRoutePoDto, ApprovePayPoDto, RejectPoDeliveryDto, ReceivePoDto } from '../dto/purchase-order.dto';

@Controller('api/purchase-orders')
@UseGuards(JwtAuthGuard)
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
  @AuditLogAction({
    actionCode: 'PO_AUTO_ROUTE',
    actionName: 'Tạo đơn đặt hàng NCC tự động',
    module: 'Purchase',
    eventType: 'CREATE',
    entityType: 'PurchaseOrder',
  })
  async createAutoRoutedPurchaseOrders(@Body() data: AutoRoutePoDto) {
    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.po.auto_route', data);
    
    console.log('📦 PO Created - Full Result:', JSON.stringify(result, null, 2));
    
    // Handle nested response
    const poData = result.data || result;
    
    // Emit notification to admin ONLY (not warehouse)
    try {
      if (this.websocketGateway.server && poData) {
        const poList = Array.isArray(poData) ? poData : (poData.poIds || [poData]);
        poList.forEach((poItem: any) => {
          const poId = typeof poItem === 'string' ? poItem : (poItem._id || poItem.id || 'PO-NEW');
          const notificationPayload = {
            type: 'NEW_PO',
            poId: poId,
            supplierName: poItem.supplierName || 'Nhà cung cấp',
            itemsCount: poItem.items?.length || 1,
            totalAmount: poItem.totalAmount || 0,
            message: `Đơn đặt hàng mới đã được tạo và chuyển tới cấp phê duyệt`,
            timestamp: new Date().toISOString(),
          };
          
          this.websocketGateway.server.to('admin').emit('new_po_notification', notificationPayload);
          
          this.notificationService.createNotification({
            userId: 'ADMIN',
            title: 'Đơn đặt hàng PO mới chờ duyệt',
            message: notificationPayload.message,
            type: 'WARNING',
            link: '/admin/approvals'
          }).catch(e => console.warn('Could not persist notification:', e));
        });
      }
    } catch (err) {
      console.warn('⚠️ Notification emission error ignored:', err);
    }

    return result;
  }

  @Post('approve-pay')
  @AuditLogAction({
    actionCode: 'PO_APPROVE_PAY',
    actionName: 'Phê duyệt và thanh toán đơn đặt hàng',
    module: 'Purchase',
    eventType: 'APPROVE',
    entityType: 'PurchaseOrder',
  })
  async approveAndPayPurchaseOrder(@Body() data: ApprovePayPoDto) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.approve_pay', data);
  }

  @Post('reject-delivery')
  @AuditLogAction({
    actionCode: 'PO_REJECT_DELIVERY',
    actionName: 'Từ chối nhận hàng đơn đặt hàng',
    module: 'Purchase',
    eventType: 'REJECT',
    entityType: 'PurchaseOrder',
  })
  async rejectPurchaseOrderDelivery(@Body() data: RejectPoDeliveryDto) {
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
  async receivePurchaseOrder(@Param('id') id: string, @Body() data: ReceivePoDto) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.receive', { id, ...data });
  }
}
