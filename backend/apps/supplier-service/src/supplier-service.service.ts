import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Supplier } from './supplier.schema';

@Injectable()
export class SupplierServiceService {
  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<Supplier>,
  ) {}

  async getById(id: string) {
    const supplier = await this.supplierModel.findById(id).exec();
    return supplier;
  }

  async getAll() {
    return await this.supplierModel.find().exec();
  }

  async create(data: any) {
    const newSupplier = new this.supplierModel(data);
    return await newSupplier.save();
  }

  async validateSupplierForOrder(supplierId: string): Promise<boolean> {
    const supplier = await this.supplierModel.findById(supplierId);
    if (!supplier) {
      throw new NotFoundException('Không tìm thấy Nhà cung cấp');
    }

    if (supplier.status !== 'ACTIVE') {
      throw new BadRequestException('Nhà cung cấp hiện không hoạt động');
    }

    const currentDate = new Date();
    if (supplier.gdp_expiry_date && supplier.gdp_expiry_date < currentDate) {
      throw new BadRequestException('Hồ sơ GDP của Nhà cung cấp đã hết hạn. Hệ thống chặn không cho lên đơn nhập hàng.');
    }

    return true;
  }
}
