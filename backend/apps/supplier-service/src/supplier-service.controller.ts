import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SupplierServiceService } from './supplier-service.service';

@Controller()
export class SupplierServiceController {
  constructor(private readonly supplierService: SupplierServiceService) {}

  @MessagePattern('supplier.get_by_id')
  async getById(@Payload() data: { id: string }) {
    return await this.supplierService.getById(data.id);
  }

  @MessagePattern('supplier.get_all')
  async getAll() {
    return await this.supplierService.getAll();
  }

  @MessagePattern('supplier.create')
  async create(@Payload() data: any) {
    return await this.supplierService.create(data);
  }
}
