import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SalesOrder } from './schemas/sales-order.schema';
import { Prescription } from './schemas/prescription.schema';
import { Medicine } from '../medicine/schemas/medicine.schema';
import { MedicineBatch } from '../medicine/schemas/medicine-batch.schema';
import { PricingService } from '../pricing/pricing.service';
import { InventoryTransaction } from '../purchase/schemas/inventory-transaction.schema';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectModel(SalesOrder.name) private readonly saleModel: Model<SalesOrder>,
    @InjectModel(Prescription.name) private readonly prescriptionModel: Model<Prescription>,
    @InjectModel(Medicine.name) private readonly medicineModel: Model<Medicine>,
    @InjectModel(MedicineBatch.name) private readonly batchModel: Model<MedicineBatch>,
    private readonly pricingService: PricingService,
    @InjectModel(InventoryTransaction.name) private readonly txnModel: Model<InventoryTransaction>,
  ) {}

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

  private getTieredPrice(medicine: any, quantity: number): number {
    if (medicine.priceTiers && medicine.priceTiers.length > 0) {
      // Sắp xếp giảm dần theo minQuantity để lấy bậc cao nhất thỏa mãn
      const sortedTiers = [...medicine.priceTiers].sort((a, b) => b.minQuantity - a.minQuantity);
      for (const tier of sortedTiers) {
        if (quantity >= tier.minQuantity) {
          return tier.price;
        }
      }
    }
    // Giá bậc thang mặc định nếu không cấu hình riêng cho thuốc này
    const basePrice = medicine.price || 50000;
    if (quantity >= 100) return Math.round(basePrice * 0.85); // Giảm 15%
    if (quantity >= 50) return Math.round(basePrice * 0.90);  // Giảm 10%
    if (quantity >= 10) return Math.round(basePrice * 0.95);  // Giảm 5%
    return basePrice;
  }

  async createSalesOrder(data: any) {
    this.logger.log(`Creating Sales Order. Type: ${data.type}, OrderCode: ${data.orderCode}`);

    // Check for duplicate sales order (idempotency check)
    if (data.orderCode) {
      const existingSale = await this.saleModel.findOne({ orderCode: data.orderCode }).exec();
      if (existingSale) {
        this.logger.log(`Sales Order for orderCode ${data.orderCode} already exists. Skipping inventory deduction.`);
        return {
          success: true,
          message: 'Trừ kho đã được thực hiện thành công từ trước!',
          data: existingSale,
        };
      }
    }

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
    const transactionLogs: any[] = [];

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
        const stockBefore = batch.stock;
        batch.stock -= deductQty;
        remainingQty -= deductQty;

        allocatedBatches.push({ batchNo: batch.batchNo, quantity: deductQty });
        await batch.save();

        transactionLogs.push({
          type: 'SALE_EXPORT',
          medicineId: item.medicineId,
          medicineName: medicine.name,
          batchNo: batch.batchNo,
          quantityChange: -deductQty,
          stockBefore,
          stockAfter: stockBefore - deductQty,
          referenceType: 'SALE',
          performedBy: data.soldBy || 'Dược sĩ',
          notes: `Bán hàng ${data.type === 'WHOLESALE' ? 'sỉ' : 'lẻ'}`,
        });
      }

      if (remainingQty > 0) {
        throw new RpcException({
          message: `Không đủ lô hàng khả dụng còn hạn cho thuốc "${medicine.name}"`
        });
      }

      // Resolve giá theo chi nhánh và loại bán hàng (UC-48)
      const itemPrice = await this.pricingService.resolvePrice(
        data.branchId,
        item.medicineId,
        data.type || 'RETAIL',
        item.quantity,
      );
      const resolvedPrice = itemPrice || medicine.price || 50000;
      totalAmount += resolvedPrice * item.quantity;

      orderItems.push({
        medicineId: item.medicineId,
        name: medicine.name,
        quantity: item.quantity,
        price: resolvedPrice,
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
      soldBy: data.soldBy || 'Dược sĩ',
      orderCode: data.orderCode,
    });
    await salesOrder.save();

    // Lưu các transaction log liên kết với mã hóa đơn bán hàng vừa tạo
    for (const log of transactionLogs) {
      log.referenceId = salesOrder._id.toString();
      await new this.txnModel(log).save();
    }

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
