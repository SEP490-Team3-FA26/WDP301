import { Controller, Post, Get, Body, Param, Inject, OnModuleInit, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
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
      'orders.my-orders',
    ]);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createOrder(@Req() req: any, @Body() data: any) {
    const payload = { ...data, userId: req.user.sub };
    return await sendKafkaMessage(this.orderClient, 'orders.create', payload);
  }

  @Get('check/:orderCode')
  async checkOrderPayment(@Param('orderCode') orderCode: string) {
    return await sendKafkaMessage(this.orderClient, 'orders.check', { orderCode: Number(orderCode) });
  }

  @UseGuards(JwtAuthGuard)
  @Post('payos-link')
  async createPayOSLink(@Req() req: any, @Body() data: any) {
    // Force method to QR_PAY and create payment link
    return await sendKafkaMessage(this.orderClient, 'orders.create', {
      ...data,
      paymentMethod: 'QR_PAY',
      userId: req.user.sub,
    });
  }

  @Get()
  async listOrders() {
    return await sendKafkaMessage(this.orderClient, 'orders.list', {});
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-orders')
  async getMyOrders(@Req() req: any) {
    const userId = req.user.sub;
    const fullName = req.user.fullName || '';
    
    return await sendKafkaMessage(this.orderClient, 'orders.my-orders', { userId, fullName });
  }
}
