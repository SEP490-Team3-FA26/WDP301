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
    // ValidationPipe transforms the request body into an AutoRoutePoDto instance.
    // Convert it back to a plain object so ClientKafka serializes it as JSON
    // instead of the string "[object Object]".
    const payload = {
      items: data.items,
      prIds: data.prIds,
      ...(data.createdBy ? { createdBy: data.createdBy } : {}),
    };

    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.po.auto_route', payload);
    
    console.log('📦 PO Created - Full Result:', JSON.stringify(result, null, 2));
    
    // Handle nested response
    const poData = result.data || result;
    
    // Emit notification to admin ONLY (not warehouse)
    try {
      if (this.websocketGateway.server && poData) {
        const poList = Array.isArray(poData) ? poData : (poData.poIds || [poData]);
        for (const poItem of poList) {
          const poId = typeof poItem === 'string' ? poItem : (poItem._id || poItem.id || 'PO-NEW');
          let notificationPayload: any = {
            type: 'NEW_PO',
            poId: poId,
            supplierName: poItem.supplierName || 'Nhà cung cấp',
            itemsCount: poItem.items?.length || 1,
            totalAmount: poItem.totalAmount || 0,
            message: `Đơn đặt hàng mới đã được tạo và chuyển tới cấp phê duyệt`,
            timestamp: new Date().toISOString(),
          };
          
          try {
            const [savedNotification] = await this.notificationService.create({
              type: 'NEW_PO',
              targetRooms: ['admin'],
              poId,
              supplierName: notificationPayload.supplierName,
              itemsCount: notificationPayload.itemsCount,
              totalAmount: notificationPayload.totalAmount,
              message: notificationPayload.message,
              createdBy: data.createdBy,
            });

            notificationPayload = {
              ...notificationPayload,
              _id: (savedNotification as any)._id,
              id: (savedNotification as any)._id,
              createdAt: (savedNotification as any).createdAt,
              read: false,
            };
          } catch (e) {
            console.warn('Could not persist notification:', e);
          }

          const adminClients = await this.websocketGateway.server.in('admin').fetchSockets();
          console.log(`📊 Admin room has ${adminClients.length} connected clients`);
          this.websocketGateway.server.to('admin').emit('new_po_notification', notificationPayload);
        }
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
    const payload = {
      poId: data.poId,
      action: data.action,
      ...(data.approvedBy ? { approvedBy: data.approvedBy } : {}),
      ...(data.rejectionReason ? { rejectionReason: data.rejectionReason } : {}),
      ...(data.paymentType ? { paymentType: data.paymentType } : {}),
    };

    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.approve_pay', payload);
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
    const payload = {
      poId: data.poId,
      ...(data.reason ? { reason: data.reason } : {}),
    };

    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.reject_delivery', payload);
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
    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.receive', {
      id,
      receivedBy: data.receivedBy,
    });
  }
}
