import { Controller, Post, Get, Query, Param, Body, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuditLogAction } from '../decorators/audit-log.decorator';

@Controller('api/purchase-orders')
@UseGuards(JwtAuthGuard)
export class PurchaseOrderController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.po.auto_route',
      'inventory.po.approve_pay',
      'inventory.po.reject_delivery',
      'inventory.po.list',
      'inventory.po.get_by_id',
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
  async createAutoRoutedPurchaseOrders(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.auto_route', data);
  }

  @Post('approve-pay')
  @AuditLogAction({
    actionCode: 'PO_APPROVE_PAY',
    actionName: 'Phê duyệt và thanh toán đơn đặt hàng',
    module: 'Purchase',
    eventType: 'APPROVE',
    entityType: 'PurchaseOrder',
  })
  async approveAndPayPurchaseOrder(@Body() data: any) {
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
}
