import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PurchaseOrder } from './purchase-order.schema';
import { GoodsReceiptNote } from './goods-receipt-note.schema';
import { MedicineBatch } from './medicine-batch.schema';
import { Prescription } from './prescription.schema';
import { SalesOrder } from './sales-order.schema';
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
    @InjectModel(Prescription.name) private readonly prescriptionModel: Model<Prescription>,
    @InjectModel(SalesOrder.name) private readonly saleModel: Model<SalesOrder>,
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

      // Kiểm tra nếu số lượng thực nhận lớn hơn số lượng đặt hàng
      if (item.quantity > poItem.quantity) {
        throw new RpcException({ message: `Số lượng thực nhận (${item.quantity}) không được vượt quá số lượng đặt hàng (${poItem.quantity})` });
      }

      totalAmount += item.quantity * item.unitPrice;

      // Cập nhật hoặc tạo mới MedicineBatch
      let batch = await this.batchModel.findOne({
        medicineId: item.medicineId,
        batchNo: item.batchNo
      }).exec();

      if (batch) {
        batch.stock += item.quantity;
        batch.status = batch.expDate < new Date() ? 'EXPIRED' : 'ACTIVE';
        await batch.save();
      } else {
        batch = new this.batchModel({
          medicineId: item.medicineId,
          batchNo: item.batchNo,
          expDate: new Date(item.expDate),
          stock: item.quantity,
          status: new Date(item.expDate) < new Date() ? 'EXPIRED' : 'ACTIVE'
        });
        await batch.save();
      }

      // KHÔNG CỘNG dồn stock vào bảng Medicine nữa vì tồn kho được tính động từ batches!
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

  async listPurchaseOrders(query: any = {}) {
    const filter: any = {};
    if (query.status) {
      filter.status = query.status;
    }
    return this.poModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async getPurchaseOrderById(id: string) {
    return this.poModel.findById(id).exec();
  }

  async listGoodsReceiptNotes() {
    return this.grnModel.find().sort({ createdAt: -1 }).exec();
  }

  // --- HỆ THỐNG ĐƠN THUỐC ĐIỆN TỬ & FIFO SALES ---

  async getPrescriptionByCode(code: string) {
    this.logger.log(`Fetching prescription by code: ${code}`);
    const prescription = await this.prescriptionModel.findOne({ prescriptionCode: code }).exec();
    if (!prescription) {
      throw new RpcException({ message: 'Không tìm thấy đơn thuốc điện tử' });
    }

    const itemsWithDetails = [];
    for (const item of prescription.items) {
      const medicine = await this.medicineModel.findById(item.medicineId).exec();
      if (medicine) {
        // Tính tồn kho khả dụng động
        const batches = await this.batchModel.find({
          medicineId: item.medicineId,
          status: 'ACTIVE',
          stock: { $gt: 0 }
        }).exec();

        const totalStock = batches.reduce((sum, b) => sum + b.stock, 0);

        let earliestExpiryStr = '2026-12-31';
        if (batches.length > 0) {
          const earliestBatch = batches.reduce((min, b) => new Date(b.expDate) < new Date(min.expDate) ? b : min, batches[0]);
          earliestExpiryStr = new Date(earliestBatch.expDate).toISOString().split('T')[0];
        }

        itemsWithDetails.push({
          medicineId: item.medicineId,
          name: medicine.name,
          active_ingredient: medicine.active_ingredient || '',
          price: medicine.price || 50000,
          quantity: item.quantity,
          dosage: item.dosage,
          unit: medicine.unit || 'Hộp',
          stock: totalStock,
          expiry: earliestExpiryStr,
          status: totalStock > 0 ? 'In Stock' : 'Out of Stock'
        });
      } else {
        itemsWithDetails.push({
          medicineId: item.medicineId,
          name: 'Thuốc không xác định',
          active_ingredient: '',
          price: 0,
          quantity: item.quantity,
          dosage: item.dosage,
          unit: 'Hộp',
          stock: 0,
          expiry: '2026-12-31',
          status: 'Out of Stock'
        });
      }
    }

    return {
      id: prescription._id.toString(),
      prescriptionCode: prescription.prescriptionCode,
      patientName: prescription.patientName,
      patientAge: prescription.patientAge,
      patientGender: prescription.patientGender,
      patientPhone: prescription.patientPhone,
      doctorName: prescription.doctorName,
      doctorSpecialty: prescription.doctorSpecialty,
      hospitalName: prescription.hospitalName,
      hospitalCode: prescription.hospitalCode,
      items: itemsWithDetails,
      status: prescription.status
    };
  }

  async listPrescriptions() {
    this.logger.log('Listing all prescriptions from database');
    const prescriptions = await this.prescriptionModel.find().sort({ createdAt: -1 }).exec();
    return prescriptions.map(p => ({
      id: p._id.toString(),
      prescriptionCode: p.prescriptionCode,
      patientName: p.patientName,
      patientAge: p.patientAge,
      patientGender: p.patientGender,
      patientPhone: p.patientPhone,
      doctorName: p.doctorName,
      doctorSpecialty: p.doctorSpecialty,
      hospitalName: p.hospitalName,
      hospitalCode: p.hospitalCode,
      items: p.items,
      status: p.status,
      createdAt: (p as any).createdAt
    }));
  }

  async createSalesOrder(data: any) {
    this.logger.log(`Creating Sales Order. Type: ${data.type}`);

    let prescription = null;
    if (data.type === 'PRESCRIPTION') {
      if (!data.prescriptionCode) {
        throw new RpcException({ message: 'Yêu cầu mã đơn thuốc để bán theo đơn' });
      }
      prescription = await this.prescriptionModel.findOne({ prescriptionCode: data.prescriptionCode }).exec();
      if (!prescription) {
        // Automatically save prescription if it is a manual paper prescription or flag is manual
        if (data.isManualPrescription || data.prescriptionCode.startsWith('PRX-HAND-')) {
          prescription = new this.prescriptionModel({
            prescriptionCode: data.prescriptionCode,
            patientName: data.patientName || 'Khách hàng kê đơn',
            patientAge: data.patientAge ? Number(data.patientAge) : 30,
            patientGender: data.patientGender || 'Nam',
            patientPhone: data.patientPhone || '',
            doctorName: data.doctorName || 'Bác sĩ kê đơn',
            doctorSpecialty: data.doctorSpecialty || 'Đa khoa',
            hospitalName: data.hospitalName || 'Bệnh viện',
            hospitalCode: data.hospitalCode || 'BV-01',
            items: data.items.map((it: any) => ({
              medicineId: it.medicineId,
              quantity: it.quantity,
              dosage: it.dosage || 'Ngày uống 2 lần, mỗi lần 1 viên sau ăn'
            })),
            status: 'PENDING'
          });
          await prescription.save();
        } else {
          throw new RpcException({ message: `Không tìm thấy đơn thuốc: ${data.prescriptionCode}` });
        }
      }
      if (prescription.status === 'FILLED') {
        throw new RpcException({ message: 'Đơn thuốc điện tử này đã được bán hoàn tất trước đó' });
      }
    }

    const today = new Date();
    const orderItems = [];
    let totalAmount = 0;
    const allWarnings: string[] = [];

    // Xuất kho FIFO
    for (const item of data.items) {
      const medicine = await this.medicineModel.findById(item.medicineId).exec();
      if (!medicine) {
        throw new RpcException({ message: `Không tìm thấy thuốc có ID: ${item.medicineId}` });
      }

      // Truy cập các lô hoạt động sắp xếp tăng dần hạn sử dụng expDate ASC -> FIFO/FEFO
      const batches = await this.batchModel.find({
        medicineId: item.medicineId,
        status: 'ACTIVE',
        stock: { $gt: 0 }
      }).sort({ expDate: 1 }).exec();

      const totalAvailable = batches.reduce((sum, b) => sum + b.stock, 0);
      if (totalAvailable < item.quantity) {
        throw new RpcException({
          message: `Thuốc "${medicine.name}" không đủ tồn kho khả dụng (Yêu cầu: ${item.quantity}, Khả dụng: ${totalAvailable})`
        });
      }

      let remainingQty = item.quantity;
      const allocatedBatches = [];

      for (const batch of batches) {
        if (remainingQty <= 0) break;

        // Nếu lô hàng đã quá ngày hết hạn
        if (batch.expDate < today) {
          batch.status = 'EXPIRED';
          await batch.save();
          continue;
        }

        // Kiểm tra cảnh báo cận HSD (dưới 6 tháng = 180 ngày)
        const diffTime = batch.expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 180) {
          allWarnings.push(
            `Lô "${batch.batchNo}" của thuốc "${medicine.name}" sắp hết hạn (HSD: ${batch.expDate.toLocaleDateString()} - Còn ${diffDays} ngày)`
          );
        }

        const deductQty = Math.min(batch.stock, remainingQty);
        batch.stock -= deductQty;
        remainingQty -= deductQty;

        allocatedBatches.push({ batchNo: batch.batchNo, quantity: deductQty });
        await batch.save();
      }

      if (remainingQty > 0) {
        throw new RpcException({
          message: `Không đủ lô hàng khả dụng còn hạn cho thuốc "${medicine.name}"`
        });
      }

      const itemPrice = medicine.price || 50000;
      totalAmount += itemPrice * item.quantity;

      orderItems.push({
        medicineId: item.medicineId,
        name: medicine.name,
        quantity: item.quantity,
        price: itemPrice,
        unit: medicine.unit || 'Hộp',
        batches: allocatedBatches
      });
    }

    // Tạo hóa đơn bán hàng
    const salesOrder = new this.saleModel({
      prescriptionId: prescription ? prescription._id.toString() : undefined,
      prescriptionCode: data.prescriptionCode,
      items: orderItems,
      totalAmount: totalAmount,
      paymentMethod: data.paymentMethod || 'CASH',
      type: data.type,
      patientName: data.patientName || (prescription ? prescription.patientName : undefined),
      patientPhone: data.patientPhone || (prescription ? prescription.patientPhone : undefined),
      soldBy: data.soldBy || 'Dược sĩ'
    });
    await salesOrder.save();

    // Cập nhật trạng thái đơn thuốc
    if (prescription) {
      prescription.status = 'FILLED';
      await prescription.save();
    }

    return {
      success: true,
      message: 'Thanh toán & trừ kho thành công!',
      warnings: allWarnings,
      data: salesOrder
    };
  }

  async listSalesOrders() {
    return this.saleModel.find().sort({ createdAt: -1 }).exec();
  }
}
