import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Supplier } from './supplier.schema';

@Injectable()
export class SupplierServiceService implements OnModuleInit {
  constructor(
    @InjectModel(Supplier.name) private supplierModel: Model<Supplier>,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.supplierModel.countDocuments().exec();
      if (count === 0) {
        console.log('🌱 Starting to seed suppliers from medicines collection...');
        const medicinesCollection = this.supplierModel.db.collection('medicines');
        
        // Lấy danh sách các category / nhà sản xuất độc nhất từ bảng medicines
        const distinctCategories = await medicinesCollection.distinct('category');
        console.log(`🔍 Found ${distinctCategories.length} distinct categories/manufacturers in medicines.`);

        const defaultSuppliers = distinctCategories.filter(cat => cat).map((categoryName, idx) => {
          const gdpExpiryDate = new Date();
          // Xen kẽ ngày hết hạn chứng nhận GDP (1 năm hoặc 2 năm) để phục vụ test case
          gdpExpiryDate.setFullYear(gdpExpiryDate.getFullYear() + (idx % 3 === 0 ? -1 : 2)); 
          
          return {
            name: categoryName,
            contact_info: `Đại diện kinh doanh của ${categoryName} - SĐT: 09876543${idx % 10} - Email: sales@${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'supplier'}.com`,
            business_registration_number: `DKKD-${100000 + idx}`,
            gdp_certificate_number: `GDP-${200000 + idx}/HN`,
            gdp_expiry_date: gdpExpiryDate,
            status: 'ACTIVE',
          };
        });

        // Nếu không có medicines nào, dùng fallback mẫu
        if (defaultSuppliers.length === 0) {
          console.log('⚠️ No categories found in medicines. Using fallback suppliers...');
          const fallbackSuppliers = [
            {
              name: 'Dược phẩm Trung ương 1 (CPC1)',
              contact_info: 'Email: cpc1@gmail.com - SĐT: 02438253272',
              business_registration_number: 'BRN-001234',
              gdp_certificate_number: 'GDP-1234/HN',
              gdp_expiry_date: new Date('2028-12-31'),
              status: 'ACTIVE',
            },
            {
              name: 'Dược Hậu Giang (DHG Pharma)',
              contact_info: 'Email: dhg@gmail.com - SĐT: 02923891433',
              business_registration_number: 'BRN-005678',
              gdp_certificate_number: 'GDP-5678/CT',
              gdp_expiry_date: new Date('2028-12-31'),
              status: 'ACTIVE',
            },
            {
              name: 'Traphaco',
              contact_info: 'Email: traphaco@gmail.com - SĐT: 02436811234',
              business_registration_number: 'BRN-009012',
              gdp_certificate_number: 'GDP-9012/HN',
              gdp_expiry_date: new Date('2025-06-01'), // Hết hạn
              status: 'ACTIVE',
            }
          ];
          await this.supplierModel.insertMany(fallbackSuppliers);
        } else {
          await this.supplierModel.insertMany(defaultSuppliers);
        }
        console.log('✅ Seeding suppliers completed.');
      }
    } catch (error) {
      console.error('❌ Failed to seed suppliers:', error);
    }
  }

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
