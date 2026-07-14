import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { MedicineService } from './medicine.service';

@Controller()
export class MedicineController {
  constructor(private readonly medicineService: MedicineService) { }

  @MessagePattern('inventory.medicine.list')
  async listMedicines(@Payload() query: any) {
    try {
      return await this.medicineService.listMedicines(query);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách thuốc');
    }
  }

  @MessagePattern('inventory.medicine.get_by_id')
  async getMedicineById(@Payload() data: { id: string }) {
    try {
      return await this.medicineService.getMedicineById(data.id);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy chi tiết thuốc');
    }
  }

  @MessagePattern('inventory.medicine.update_status')
  async updateMedicineStatus(@Payload() data: { id: string; status: string; stock?: number }) {
    try {
      return await this.medicineService.updateMedicineStatus(data.id, data.status, data.stock);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi cập nhật trạng thái thuốc');
    }
  }

  @MessagePattern('inventory.medicine.update_price_tiers')
  async updateMedicinePriceTiers(@Payload() data: { id: string; priceTiers: { minQuantity: number; price: number }[] }) {
    try {
      return await this.medicineService.updateMedicinePriceTiers(data.id, data.priceTiers);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi cập nhật giá sỉ bậc thang');
    }
  }

  @MessagePattern('inventory.medicine.update_price')
  async updateMedicinePrice(@Payload() data: { id: string; price: number }) {
    try {
      return await this.medicineService.updateMedicinePrice(data.id, data.price);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi cập nhật giá thuốc');
    }
  }

  @MessagePattern('inventory.medicine.get_filters')
  async getMedicineFilters() {
    try {
      return await this.medicineService.getMedicineFilters();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy bộ lọc thuốc');
    }
  }

  @MessagePattern('inventory.medicine.stats')
  async getInventoryStats() {
    try {
      return await this.medicineService.getInventoryStats();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy thống kê tồn kho');
    }
  }

  @MessagePattern('inventory.medicine.expiration_report')
  async getExpirationReport() {
    try {
      return await this.medicineService.getExpirationReport();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy báo cáo hết hạn');
    }
  }

  @MessagePattern('inventory.medicine.get_by_ids')
  async getMedicinesByIds(@Payload() data: { ids: string[] }) {
    try {
      return await this.medicineService.getMedicinesByIds(data.ids);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy chi tiết danh sách thuốc');
    }
  }

  @MessagePattern('inventory.check.create')
  async createInventoryCheck(@Payload() data: any) {
    try {
      return await this.medicineService.createInventoryCheck(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tạo biên bản kiểm kê');
    }
  }

  @MessagePattern('inventory.check.list')
  async listInventoryChecks() {
    try {
      return await this.medicineService.listInventoryChecks();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách biên bản kiểm kê');
    }
  }

  @MessagePattern('inventory.check.get_by_id')
  async getInventoryCheckById(@Payload() data: { id: string }) {
    try {
      return await this.medicineService.getInventoryCheckById(data.id);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy chi tiết biên bản kiểm kê');
    }
  }

  @MessagePattern('inventory.check.complete')
  async completeInventoryCheck(@Payload() data: { id: string }) {
    try {
      return await this.medicineService.completeInventoryCheck(data.id);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi hoàn tất biên bản kiểm kê');
    }
  }

  @MessagePattern('inventory.medicine.low_stock_report')
  async getLowStockReport() {
    try {
      return await this.medicineService.getLowStockReport();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy báo cáo thuốc sắp hết hàng');
    }
  }

  @MessagePattern('inventory.medicine.dropdown_list')
  async getMedicinesDropdown() {
    try {
      return await this.medicineService.getMedicinesDropdown();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách chọn thuốc');
    }
  }

  @MessagePattern('inventory.medicine.get_alternatives')
  async getAlternatives(@Payload() data: { medicineId: string; branchId: string }) {
    try {
      return await this.medicineService.findAlternatives(data.medicineId, data.branchId);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tìm thuốc thay thế');
    }
  }
}

