import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { OrdersServiceService } from './orders-service.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller()
export class OrdersServiceController {
  constructor(private readonly ordersServiceService: OrdersServiceService) {}

  @MessagePattern('orders.create')
  async createOrder(@Payload() data: CreateOrderDto) {
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

  @MessagePattern('orders.my-orders')
  async getMyOrders(@Payload() data: { userId: string; fullName?: string }) {
    try {
      return await this.ordersServiceService.getMyOrders(data.userId, data.fullName);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy lịch sử đơn hàng');
    }
  }

  @MessagePattern('vouchers.create')
  async createVoucher(@Payload() data: any) {
    try {
      return await this.ordersServiceService.createVoucher(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tạo voucher');
    }
  }

  @MessagePattern('vouchers.update')
  async updateVoucher(@Payload() data: any) {
    try {
      return await this.ordersServiceService.updateVoucher(data.id, data.payload);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi cập nhật voucher');
    }
  }

  @MessagePattern('vouchers.delete')
  async deleteVoucher(@Payload() data: { id: string }) {
    try {
      return await this.ordersServiceService.deleteVoucher(data.id);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi xóa voucher');
    }
  }

  @MessagePattern('vouchers.list')
  async listVouchers() {
    try {
      return await this.ordersServiceService.listVouchers();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách voucher');
    }
  }

  @MessagePattern('vouchers.validate')
  async validateVoucher(@Payload() data: { code: string; subtotal: number }) {
    try {
      return await this.ordersServiceService.validateVoucher(data.code, data.subtotal);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi kiểm tra voucher');
    }
  }
}
