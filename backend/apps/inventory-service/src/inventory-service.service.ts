import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PurchaseOrder } from './purchase-order.schema';
import { GoodsReceiptNote } from './goods-receipt-note.schema';
import { MedicineBatch } from './medicine-batch.schema';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class InventoryServiceService {
  private readonly logger = new Logger(InventoryServiceService.name);

  constructor(
    @Inject('SUPPLIER_SERVICE') private readonly supplierClient: ClientKafka,
    @InjectModel(PurchaseOrder.name) private readonly poModel: Model<PurchaseOrder>,
    @InjectModel('Medicine') private readonly medicineModel: Model<any>,
    @InjectModel(GoodsReceiptNote.name) private readonly grnModel: Model<GoodsReceiptNote>,
    @InjectModel(MedicineBatch.name) private readonly batchModel: Model<MedicineBatch>,
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
      status: 'PENDING', // Đơn chờ nhập kho
    });

    await po.save();

    return {
      success: true,
      message: 'Tạo đơn hàng thành công, chờ nhập kho',
      data: po,
    };
  }

  async createGoodsReceiptNote(data: any) {
    this.logger.log(`Creating Goods Receipt Note for PO: ${data.poId}`);

    const po = await this.poModel.findById(data.poId).exec();
    if (!po) {
      throw new RpcException({ message: `Không tìm thấy đơn hàng PO: ${data.poId}` });
    }

    if (po.status === 'COMPLETED') {
      throw new RpcException({ message: 'Đơn hàng này đã được nhập kho hoàn tất' });
    }

    // Xác minh items
    let totalAmount = 0;
    for (const item of data.items) {
      // Tìm item trong PO để đối chiếu (giả sử nhập đúng số lượng và giá)
      const poItem = po.items.find(i => i.medicineId === item.medicineId);
      if (!poItem) {
        throw new RpcException({ message: `Sản phẩm ${item.medicineId} không có trong đơn đặt hàng` });
      }

      totalAmount += item.quantity * item.unitPrice;

      // Cập nhật hoặc tạo mới MedicineBatch
      let batch = await this.batchModel.findOne({
        medicineId: item.medicineId,
        batchNo: item.batchNo
      }).exec();

      if (batch) {
        batch.stock += item.quantity;
        await batch.save();
      } else {
        batch = new this.batchModel({
          medicineId: item.medicineId,
          batchNo: item.batchNo,
          expDate: new Date(item.expDate),
          stock: item.quantity,
          status: 'ACTIVE'
        });
        await batch.save();
      }

      // Cộng dồn stock tổng vào Medicine
      await this.medicineModel.findByIdAndUpdate(item.medicineId, {
        $inc: { stock: item.quantity }
      });
    }

    // Tạo Phiếu Nhập Kho
    const grn = new this.grnModel({
      poId: data.poId,
      items: data.items,
      totalAmount: totalAmount,
      receivedBy: data.receivedBy || 'Thủ Kho',
      status: 'COMPLETED'
    });

    await grn.save();

    // Cập nhật trạng thái PO
    po.status = 'COMPLETED';
    await po.save();

    return {
      success: true,
      message: 'Tạo phiếu nhập kho thành công, đã cập nhật số lô và tồn kho',
      data: grn
    };
  }
}
