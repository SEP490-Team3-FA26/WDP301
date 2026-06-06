import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { InventoryServiceService } from './inventory-service.service';

@Controller()
export class InventoryServiceController {
  constructor(private readonly inventoryServiceService: InventoryServiceService) {}

  @MessagePattern('inventory.po.create')
  async createPurchaseOrder(@Payload() data: any) {
    try {
      return await this.inventoryServiceService.createPurchaseOrder(data);
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException(error.message || 'Lỗi hệ thống khi tạo đơn nhập');
    }
  }
}
