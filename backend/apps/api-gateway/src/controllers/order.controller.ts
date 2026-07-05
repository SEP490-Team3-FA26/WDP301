import { Controller, Post, Get, Body, Param, Inject, OnModuleInit, Req } from '@nestjs/common';
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
  async createOrder(@Body() data: any, @Req() req: any) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (payload) {
          if (payload.sub) data.userId = payload.sub;
          if (payload.branchId && !data.branchId) data.branchId = payload.branchId;
        }
      } catch (err) {
        // Ignore decoding errors
      }
    }
    return await sendKafkaMessage(this.orderClient, 'orders.create', data);
  }

  @Get('check/:orderCode')
  async checkOrderPayment(@Param('orderCode') orderCode: string) {
    return await sendKafkaMessage(this.orderClient, 'orders.check', { orderCode: Number(orderCode) });
  }

  @Post('payos-link')
  async createPayOSLink(@Body() data: any, @Req() req: any) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (payload) {
          if (payload.sub) data.userId = payload.sub;
          if (payload.branchId && !data.branchId) data.branchId = payload.branchId;
        }
      } catch (err) {
        // Ignore decoding errors
      }
    }
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
