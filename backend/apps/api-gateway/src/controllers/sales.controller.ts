import { Controller, Post, Get, Body, Param, Query, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuditLogAction } from '../decorators/audit-log.decorator';

@Controller('api/sales')
@UseGuards(JwtAuthGuard)
export class SalesController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.sale.create',
      'inventory.sale.list',
      'inventory.sale.get',
      'inventory.sale.return',
      'inventory.sale.exchange',
    ]);
  }

  @Post()
  @AuditLogAction({
    actionCode: 'SALES_CREATE',
    actionName: 'Bán lẻ thuốc tại quầy',
    module: 'Sales',
    eventType: 'CREATE',
    entityType: 'SalesOrder',
  })
  async createSalesOrder(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sale.create', data);
  }

  @Get()
  async listSalesOrders(@Query('search') search?: string, @Query('type') type?: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sale.list', { search, type });
  }

  @Get(':id')
  async getSalesOrderById(@Param('id') id: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sale.get', { id });
  }

  @Post('return')
  async processReturn(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sale.return', data);
  }

  @Post('exchange')
  async processExchange(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sale.exchange', data);
  }
}
