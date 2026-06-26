import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { PricingService } from './pricing.service';

@Controller()
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @MessagePattern('inventory.pricing.list')
  async getPriceListByBranch(@Payload() data: { branchId: string; page?: number; limit?: number; search?: string }) {
    try {
      return await this.pricingService.getPriceListByBranch(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy bảng giá chi nhánh');
    }
  }

  @MessagePattern('inventory.pricing.upsert')
  async upsertPrice(@Payload() data: any) {
    try {
      return await this.pricingService.upsertPrice(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi cập nhật bảng giá');
    }
  }

  @MessagePattern('inventory.pricing.bulk_upsert')
  async bulkUpsertPrices(@Payload() data: any) {
    try {
      return await this.pricingService.bulkUpsertPrices(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi cập nhật hàng loạt bảng giá');
    }
  }

  @MessagePattern('inventory.pricing.delete')
  async deletePrice(@Payload() data: { branchId: string; medicineId: string }) {
    try {
      return await this.pricingService.deletePrice(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi xóa bảng giá');
    }
  }

  @MessagePattern('inventory.pricing.resolve')
  async resolvePrice(@Payload() data: { branchId: string; medicineId: string; type?: string; quantity?: number }) {
    try {
      const price = await this.pricingService.resolvePrice(data.branchId, data.medicineId, data.type, data.quantity);
      return { price };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tính giá');
    }
  }

  @MessagePattern('inventory.pricing.copy')
  async copyPriceList(@Payload() data: { fromBranchId: string; toBranchId: string; updatedBy?: string }) {
    try {
      return await this.pricingService.copyPriceList(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi sao chép bảng giá');
    }
  }

  @MessagePattern('inventory.pricing.summary')
  async getAllBranchPriceSummary() {
    try {
      return await this.pricingService.getAllBranchPriceSummary();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy tổng hợp bảng giá');
    }
  }
}
