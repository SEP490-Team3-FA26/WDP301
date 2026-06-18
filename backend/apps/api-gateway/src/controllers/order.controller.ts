import { Controller, Post, Get, Body, Param, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';

@Controller('api/orders')
export class OrderController implements OnModuleInit {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.orderClient, [
      'orders.create',
      'orders.check',
      'orders.list',
    ]);
  }

  @Post()
  async createOrder(@Body() data: any) {
    return await sendKafkaMessage(this.orderClient, 'orders.create', data);
  }

  @Get('check/:orderCode')
  async checkOrderPayment(@Param('orderCode') orderCode: string) {
    return await sendKafkaMessage(this.orderClient, 'orders.check', { orderCode: Number(orderCode) });
  }

  @Post('payos-link')
  async createPayOSLink(@Body() data: any) {
    // Force method to QR_PAY and create payment link
    return await sendKafkaMessage(this.orderClient, 'orders.create', {
      ...data,
      paymentMethod: 'QR_PAY',
    });
  }

  @Get()
  async listOrders() {
    return await sendKafkaMessage(this.orderClient, 'orders.list', {});
  }
}
