import { Controller, Post, Get, Body, Param, Query, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';

@Controller('api/sales')
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
  async createSalesOrder(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sale.create', data);
  }

  @Get()
  async listSalesOrders(@Query('search') search?: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sale.list', { search });
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
