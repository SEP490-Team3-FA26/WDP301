import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { OrdersServiceService } from './orders-service.service';

@Controller()
export class OrdersServiceController {
  constructor(private readonly ordersServiceService: OrdersServiceService) {}

  @MessagePattern('orders.create')
  async createOrder(@Payload() data: any) {
    try {
      return await this.ordersServiceService.createOrder(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tạo đơn hàng');
    }
  }

  @MessagePattern('orders.check')
  async checkPaymentStatus(@Payload() data: { orderCode: number }) {
    try {
      return await this.ordersServiceService.checkPaymentStatus(Number(data.orderCode));
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi kiểm tra trạng thái thanh toán');
    }
  }

  @MessagePattern('orders.list')
  async listOrders() {
    try {
      return await this.ordersServiceService.listOrders();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách đơn hàng');
    }
  }
}
