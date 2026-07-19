import { Controller, Post, Get, Body, Param, Inject, OnModuleInit, Req, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateOrderDto } from '../dto/create-order.dto';

@Controller('api/orders')
@UseGuards(JwtAuthGuard)
export class OrderController implements OnModuleInit {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientKafka,
  ) { }

  async onModuleInit() {
    await subscribeToKafkaTopics(this.orderClient, [
      'orders.create',
      'orders.check',
      'orders.list',
      'orders.my-orders',
    ]);
  }

  @Post()
  async createOrder(@Body() data: CreateOrderDto, @Req() req: any) {
    if (req.user) {
      if (req.user.sub) data.userId = req.user.sub;
      if (req.user.branchId && !data.branchId) data.branchId = req.user.branchId;
    }
    return await sendKafkaMessage(this.orderClient, 'orders.create', data);
  }

  @Get('check/:orderCode')
  async checkOrderPayment(@Param('orderCode') orderCode: string) {
    return await sendKafkaMessage(this.orderClient, 'orders.check', { orderCode: Number(orderCode) });
  }

  @Post('payos-link')
  async createPayOSLink(@Body() data: CreateOrderDto, @Req() req: any) {
    if (req.user) {
      if (req.user.sub) data.userId = req.user.sub;
      if (req.user.branchId && !data.branchId) data.branchId = req.user.branchId;
    }
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

  @Get('my-orders')
  async getMyOrders(@Req() req: any) {
    const userId = req.user.sub;
    const fullName = req.user.fullName || '';

    return await sendKafkaMessage(this.orderClient, 'orders.my-orders', { userId, fullName });
  }
}

