import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PurchaseOrder } from './purchase-order.schema';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class InventoryServiceService {
  private readonly logger = new Logger(InventoryServiceService.name);

  constructor(
    @Inject('SUPPLIER_SERVICE') private readonly supplierClient: ClientKafka,
    @InjectModel(PurchaseOrder.name) private readonly poModel: Model<PurchaseOrder>,
    @InjectModel('Medicine') private readonly medicineModel: Model<any>,
  ) {}

  async onModuleInit() {
    this.supplierClient.subscribeToResponseOf('supplier.get_by_id');
    await this.supplierClient.connect();
  }

  async createPurchaseOrder(data: any) {
    this.logger.log(`Creating Purchase Order for Supplier: ${data.supplierId}`);

    // 1. Thẩm định Pháp lý Nhà Cung Cấp (GDP) qua Kafka
    let supplier;
    try {
      supplier = await firstValueFrom(
        this.supplierClient.send('supplier.get_by_id', { id: data.supplierId })
      );
    } catch (e) {
      throw new RpcException({ message: 'Không thể kết nối đến Supplier Service để thẩm định' });
    }

    if (!supplier) {
      throw new RpcException({ message: 'Không tìm thấy thông tin Nhà cung cấp' });
    }

    const today = new Date();
    if (supplier.gdp_expiry_date && new Date(supplier.gdp_expiry_date) < today) {
      throw new RpcException({ message: `Giấy chứng nhận GDP của "${supplier.name}" đã HẾT HẠN vào ngày ${new Date(supplier.gdp_expiry_date).toLocaleDateString()}. Yêu cầu gia hạn hồ sơ trước khi nhập hàng!` });
    }

    // 2. Thẩm định Pháp lý Thuốc (Số đăng ký)
    for (const item of data.items) {
      const medicine = await this.medicineModel.findById(item.medicineId).exec();
      if (!medicine) {
        throw new RpcException({ message: `Không tìm thấy thuốc có ID: ${item.medicineId}` });
      }

      if (medicine.expiry_date && new Date(medicine.expiry_date) < today) {
         throw new RpcException({ message: `Số đăng ký của thuốc "${medicine.name}" đã hết hạn vào ngày ${new Date(medicine.expiry_date).toLocaleDateString()}. Không thể lên đơn nhập!` });
      }
    }

    // 3. Tạo Purchase Order
    const po = new this.poModel({
      supplierId: data.supplierId,
      items: data.items,
      totalAmount: data.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
      status: 'COMPLETED', // Tạm thời set COMPLETED luôn
    });

    await po.save();
    
    // Cập nhật số lượng tồn kho (Optional, can be done via events)
    for (const item of data.items) {
        await this.medicineModel.findByIdAndUpdate(item.medicineId, {
            $inc: { stock: item.quantity }
        });
    }

    return {
      success: true,
      message: 'Tạo đơn nhập hàng thành công',
      data: po,
    };
  }
}
