import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report } from './schemas/report.schema';
import { SalesOrder } from '../sales/schemas/sales-order.schema';
import { PurchaseOrder } from '../purchase/schemas/purchase-order.schema';
import { Medicine } from '../medicine/schemas/medicine.schema';
import { MedicineBatch } from '../medicine/schemas/medicine-batch.schema';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    @InjectModel(SalesOrder.name) private readonly saleModel: Model<SalesOrder>,
    @InjectModel(PurchaseOrder.name) private readonly poModel: Model<PurchaseOrder>,
    @InjectModel(Medicine.name) private readonly medicineModel: Model<Medicine>,
    @InjectModel(MedicineBatch.name) private readonly batchModel: Model<MedicineBatch>,
  ) {}

  async getForecastDataset(periodDays = 30, branchId?: string) {
    this.logger.log(`Compiling forecast dataset. Period: ${periodDays} days, Branch: ${branchId || 'all'}`);
    
    // 1. Lấy tất cả thuốc hoạt động
    const medicines = await this.medicineModel.find({ status: { $ne: 'INACTIVE' } }).lean().exec();
    
    // Thời điểm bắt đầu tính doanh số
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    
    // Query điều kiện doanh số
    const salesQuery: any = {
      createdAt: { $gte: startDate }
    };
    if (branchId && branchId !== 'all') {
      salesQuery.branchId = branchId;
    }

    // 2. Tính tổng số lượng bán của từng thuốc
    const salesAggregation = await this.saleModel.aggregate([
      { $match: salesQuery },
      { $unwind: "$items" },
      { $group: {
          _id: "$items.medicineId",
          totalSold: { $sum: "$items.quantity" }
        }
      }
    ]);

    const salesMap = new Map<string, number>();
    salesAggregation.forEach(item => {
      salesMap.set(String(item._id), item.totalSold);
    });

    // 3. Tính hàng sắp về (Expected Incoming) từ các PO đang treo
    const poQuery: any = {
      status: { $in: ['PENDING_APPROVAL', 'SHIPPING', 'RECEIVING', 'PARTIAL_RECEIVED'] }
    };
    const activePos = await this.poModel.find(poQuery).lean().exec();
    const incomingMap = new Map<string, number>();
    activePos.forEach(po => {
      po.items.forEach(item => {
        const pendingQty = Math.max(0, item.quantity - (item.receivedQuantity || 0));
        if (pendingQty > 0) {
          incomingMap.set(item.medicineId, (incomingMap.get(item.medicineId) || 0) + pendingQty);
        }
      });
    });

    // 4. Lấy tồn kho chi tiết theo từng thuốc
    const batchQuery: any = { status: 'ACTIVE' };
    if (branchId && branchId !== 'all') {
      batchQuery.branchId = branchId;
    }
    const activeBatches = await this.batchModel.find(batchQuery).lean().exec();
    
    const stockMap = new Map<string, number>();
    activeBatches.forEach(batch => {
      stockMap.set(batch.medicineId, (stockMap.get(batch.medicineId) || 0) + batch.stock);
    });

    // 5. Kết hợp dữ liệu
    const dataset = medicines.map(med => {
      const medId = med._id.toString();
      const currentStock = stockMap.get(medId) || 0;
      const totalSold = salesMap.get(medId) || 0;
      const expectedIncoming = incomingMap.get(medId) || 0;
      const averageDailySales = Number((totalSold / periodDays).toFixed(2));
      
      return {
        medicineId: medId,
        name: med.name,
        category: med.category || 'Chưa phân loại',
        unit: med.unit || 'Hộp',
        price: med.price || 0,
        currentStock,
        totalSold,
        averageDailySales,
        expectedIncoming,
        minStock: (med as any).minStock || 50,
      };
    });

    return dataset;
  }

  async createReportRecord(data: any) {
    try {
      const newReport = new this.reportModel({
        ...data,
      });
      const savedReport = await newReport.save();
      return savedReport;
    } catch (error) {
      this.logger.error(`Error saving report record: ${error.message}`);
      throw error;
    }
  }

  async getReportHistory(query: any) {
    try {
      const { branchId, type, limit = 50, skip = 0 } = query;
      const filter: any = {};
      
      if (branchId && branchId !== 'all') {
        filter.branchId = branchId;
      }
      
      if (type) {
        filter.type = type;
      }

      const reports = await this.reportModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(Number(skip))
        .limit(Number(limit))
        .lean()
        .exec();

      return reports.map(r => ({
        id: r.reportCode,
        name: r.name,
        type: r.type,
        format: r.format,
        date: new Date(r['createdAt']).toLocaleDateString('vi-VN'),
        size: r.size || '---',
        status: r.status,
        author: r.author,
        downloadUrl: r.downloadUrl,
      }));
    } catch (error) {
      this.logger.error(`Error fetching report history: ${error.message}`);
      throw error;
    }
  }
}
