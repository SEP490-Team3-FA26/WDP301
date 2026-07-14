import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { SalesService } from './sales.service';

@Controller()
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @MessagePattern('inventory.prescription.get')
  async getPrescriptionByCode(@Payload() data: { code: string; branchId?: string }) {
    try {
      return await this.salesService.getPrescriptionByCode(data.code, data.branchId);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy thông tin đơn thuốc');
    }
  }

  @MessagePattern('inventory.prescription.list')
  async listPrescriptions() {
    try {
      return await this.salesService.listPrescriptions();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách đơn thuốc');
    }
  }

  @MessagePattern('inventory.sale.create')
  async createSalesOrder(@Payload() data: any) {
    try {
      return await this.salesService.createSalesOrder(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tạo đơn bán hàng');
    }
  }

  @MessagePattern('inventory.sale.revert')
  async revertSalesOrder(@Payload() data: { orderCode: string }) {
    try {
      return await this.salesService.revertSalesOrder(data.orderCode);
    } catch (error: any) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi rollback đơn bán hàng');
    }
  }

  @MessagePattern('inventory.sale.list')
  async listSalesOrders(@Payload() data: { search?: string; type?: string }) {
    try {
      return await this.salesService.listSalesOrders(data?.search, data?.type);
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách đơn bán hàng');
    }
  }

  // UC-08	Xử lý đổi / trả hàng

  @MessagePattern('inventory.sale.get')
  async getSalesOrderById(@Payload() data: { id: string }) {
    try {
      return await this.salesService.getSalesOrderById(data.id);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy thông tin đơn bán hàng');
    }
  }

  @MessagePattern('inventory.sale.return')
  async processReturn(@Payload() data: any) {
    try {
      return await this.salesService.processReturn(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi xử lý trả hàng');
    }
  }

  @MessagePattern('inventory.sale.exchange')
  async processExchange(@Payload() data: any) {
    try {
      return await this.salesService.processExchange(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi xử lý đổi hàng');
    }
  }

  @MessagePattern('inventory.sale.report')
  async getRevenueReportData(@Payload() data: { branchId: string; period: string; date: string }) {
    try {
      return await this.salesService.getRevenueReportData(data.branchId, data.period, data.date);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy báo cáo doanh thu');
    }
  }

  @MessagePattern('inventory.sale.performance')
  async getInventoryPerformance(@Payload() data: { branchId: string; startDate: string; endDate: string }) {
    try {
      return await this.salesService.getInventoryPerformance(data.branchId, data.startDate, data.endDate);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy báo cáo hiệu suất');
    }
  }
}
