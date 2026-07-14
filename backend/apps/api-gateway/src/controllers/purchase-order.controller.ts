import { Controller, Post, Get, Query, Param, Body, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';

@Controller('api/purchase-orders')
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
      'inventory.po.receive',
    ]);
  }



  @Post('auto-route')
  async createAutoRoutedPurchaseOrders(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.po.auto_route', data);
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
