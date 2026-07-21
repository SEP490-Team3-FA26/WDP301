import { Controller, Post, Get, Body, Param, Inject, OnModuleInit, Req, UseGuards, Query, Res } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';
import { CreateOrderDto } from '../dto/create-order.dto';

@Controller('api/orders')
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
  @UseGuards(OptionalJwtAuthGuard)
  async createOrder(@Body() data: CreateOrderDto, @Req() req: any) {
    if (req.user) {
      if (req.user.sub) data.userId = req.user.sub;
      if (req.user.branchId && !data.branchId) data.branchId = req.user.branchId;
    }
    return await sendKafkaMessage(this.orderClient, 'orders.create', { ...data });
  }

  @Get('check/:orderCode')
  async checkOrderPayment(@Param('orderCode') orderCode: string) {
    return await sendKafkaMessage(this.orderClient, 'orders.check', { orderCode: Number(orderCode) });
  }

  @Get('payos-callback')
  async payosCallback(@Query() query: any, @Res() res: any) {
    const orderCode = query.orderCode;
    let isSuccess = false;
    let message = 'Đang kiểm tra trạng thái thanh toán...';

    if (orderCode) {
      try {
        const checkResult = await sendKafkaMessage(this.orderClient, 'orders.check', { orderCode: Number(orderCode) });
        if (checkResult?.status === 'PAID' || checkResult?.order?.paymentStatus === 'PAID') {
          isSuccess = true;
          message = 'Thanh toán thành công! Đơn hàng đã được hệ thống xác nhận và cập nhật tồn kho.';
        } else if (checkResult?.status === 'CANCELLED' || query.cancel === 'true') {
          message = 'Thanh toán đã bị hủy hoặc chưa hoàn tất.';
        }
      } catch (err: any) {
        console.error('Error during PayOS callback check:', err);
      }
    }

    const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Trạng thái thanh toán</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f0f2f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 16px; }
        .card { background: white; border-radius: 24px; box-shadow: 0 12px 36px rgba(0,0,0,0.1); padding: 36px 28px; text-align: center; max-width: 400px; width: 100%; box-sizing: border-box; }
        .icon { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 40px; font-weight: bold; }
        .success-icon { background-color: #e8f5e9; color: #2e7d32; }
        .cancel-icon { background-color: #ffebee; color: #c62828; }
        h2 { margin: 0 0 12px; color: #0d47a1; font-size: 22px; font-weight: 800; }
        p { color: #546e7a; font-size: 14px; line-height: 1.6; margin: 0 0 24px; }
        .order-badge { font-weight: bold; color: #0d47a1; background: #e3f2fd; padding: 6px 16px; border-radius: 20px; font-size: 14px; display: inline-block; margin-bottom: 20px; }
        .btn { display: block; width: 100%; padding: 16px 0; background: #0d47a1; color: white; border-radius: 14px; text-decoration: none; font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px rgba(13,71,161,0.35); box-sizing: border-box; }
        .btn:active { transform: scale(0.98); }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon ${isSuccess ? 'success-icon' : 'cancel-icon'}">${isSuccess ? '✓' : '✕'}</div>
        <h2>${isSuccess ? 'Thanh toán thành công!' : 'Thanh toán chưa hoàn tất'}</h2>
        ${orderCode ? `<div class="order-badge">Đơn hàng #${orderCode}</div>` : ''}
        <p>${message}</p>
        <a href="intent://checkout#Intent;scheme=wdp301;package=com.example.mobile;end;" class="btn">Đóng & Quay lại ứng dụng</a>
      </div>
      <script>
        function returnToApp() {
          try {
            window.location.href = 'intent://checkout#Intent;scheme=wdp301;package=com.example.mobile;end;';
          } catch(e) {
            window.location.href = 'wdp301://checkout';
          }
        }
        setTimeout(returnToApp, 1200);
      </script>
    </body>
    </html>
    `;

    return res.type('text/html').send(html);
  }

  @Post('payos-link')
  @UseGuards(OptionalJwtAuthGuard)
  async createPayOSLink(@Body() data: CreateOrderDto, @Req() req: any) {
    if (req.user) {
      if (req.user.sub) data.userId = req.user.sub;
      if (req.user.branchId && !data.branchId) data.branchId = req.user.branchId;
    }
    // Force method to QR_PAY and create payment link
    return await sendKafkaMessage(this.orderClient, 'orders.create', {
      ...data,
      paymentMethod: 'QR_PAY',
      userId: req.user?.sub,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listOrders() {
    return await sendKafkaMessage(this.orderClient, 'orders.list', {});
  }

  @Get('my-orders')
  @UseGuards(OptionalJwtAuthGuard)
  async getMyOrders(@Req() req: any, @Query('phone') phone?: string) {
    const userId = req.user?.sub;
    const fullName = req.user?.fullName || '';

    return await sendKafkaMessage(this.orderClient, 'orders.my-orders', { userId, fullName, phone });
  }
}


