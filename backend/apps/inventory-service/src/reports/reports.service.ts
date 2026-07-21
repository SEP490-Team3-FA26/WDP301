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
    
    // 1. Lấy tất cả thuốc hoạt động (chỉ lấy các trường cần thiết để tối ưu hóa hiệu năng)
    const medicines = await this.medicineModel.find(
      { status: { $ne: 'INACTIVE' } },
      '_id name category unit price minStock status'
    ).lean().exec();
    
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
  }

  async getSeasonalDataset(branchId?: string, monthsCount = 12) {
    this.logger.log(`Compiling seasonal dataset. Months: ${monthsCount}, Branch: ${branchId || 'all'}`);
    
    // 1. Lấy tất cả thuốc hoạt động (chỉ lấy các trường cần thiết để tối ưu hóa hiệu năng và tránh load các trường lớn như hình ảnh/mô tả)
    const medicines = await this.medicineModel.find(
      { status: { $ne: 'INACTIVE' } },
      '_id name category unit price supplierId safetyStock reorderPoint'
    ).lean().exec();
    
    // Thời điểm bắt đầu tính doanh số
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsCount);
    
    const salesQuery: any = {
      createdAt: { $gte: startDate }
    };
    if (branchId && branchId !== 'all') {
      salesQuery.branchId = branchId;
    }
    
    // 2. Aggregate chi tiết doanh số theo từng lô hàng
    const salesByMonth = await this.saleModel.aggregate([
      { $match: salesQuery },
      { $unwind: "$items" },
      { $unwind: { path: "$items.batches", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          medicineId: "$items.medicineId",
          medicineName: "$items.name",
          quantity: { $ifNull: ["$items.batches.quantity", "$items.quantity"] },
          price: "$items.price",
          batchNo: "$items.batches.batchNo",
          month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }
        }
      }
    ]);
    
    // 3. Lấy thông tin giá nhập từ GoodsReceiptNote theo batchNo
    const batchNos = [...new Set(salesByMonth.map(s => s.batchNo).filter(Boolean))];
    const grnCollection = this.medicineModel.db.collection('goodsreceiptnotes');
    
    // Đảm bảo có index để tránh full collection scan gây timeout
    await grnCollection.createIndex({ "items.batchNo": 1 }).catch(err => {
      this.logger.warn(`Failed to create index on goodsreceiptnotes: ${err.message}`);
    });

    const grns = await grnCollection.find({
      "items.batchNo": { $in: batchNos }
    }).toArray();
    
    const batchPriceMap = new Map<string, number>();
    grns.forEach((grn: any) => {
      grn.items.forEach((item: any) => {
        if (item.batchNo && item.unitPrice !== undefined) {
          batchPriceMap.set(item.batchNo, item.unitPrice);
        }
      });
    });
    
    // 4. Gom nhóm doanh số, doanh thu và lợi nhuận thực tế theo tháng trong memory
    const medicineSales = new Map<string, Record<string, { quantity: number; revenue: number; profit: number }>>();
    salesByMonth.forEach(sale => {
      const medId = String(sale.medicineId);
      const month = sale.month;
      const qty = sale.quantity || 0;
      const price = sale.price || 0;
      const revenue = qty * price;
      
      const importPrice = sale.batchNo && batchPriceMap.has(sale.batchNo)
        ? batchPriceMap.get(sale.batchNo)
        : 0.7 * price; // fallback bằng 70% giá bán lẻ nếu không có thông tin GRN
      
      const cogs = qty * importPrice;
      const profit = revenue - cogs;
      
      if (!medicineSales.has(medId)) {
        medicineSales.set(medId, {});
      }
      
      const monthsMap = medicineSales.get(medId);
      if (!monthsMap[month]) {
        monthsMap[month] = { quantity: 0, revenue: 0, profit: 0 };
      }
      
      monthsMap[month].quantity += qty;
      monthsMap[month].revenue += revenue;
      monthsMap[month].profit += profit;
    });
    
    // 5. Lấy hàng đang về (Expected Incoming) từ các PO đang treo
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
    
    // 6. Lấy tồn kho chi tiết theo từng thuốc
    const batchQuery: any = { status: 'ACTIVE' };
    if (branchId && branchId !== 'all') {
      batchQuery.branchId = branchId;
    }
    const activeBatches = await this.batchModel.find(batchQuery).lean().exec();
    const stockMap = new Map<string, number>();
    activeBatches.forEach(batch => {
      stockMap.set(batch.medicineId, (stockMap.get(batch.medicineId) || 0) + batch.stock);
    });
    
    // 7. Lấy danh sách nhà cung cấp để gán thuộc tính Lead Time & MOQ
    const suppliersCol = this.medicineModel.db.collection('suppliers');
    const suppliers = await suppliersCol.find({}).toArray();
    const supplierMap = new Map<string, any>(suppliers.map(s => [s._id.toString(), s]));
    
    // 8. Kết xuất tập dữ liệu hoàn chỉnh
    const dataset = medicines.map(med => {
      const medId = med._id.toString();
      const currentStock = stockMap.get(medId) || 0;
      const expectedIncoming = incomingMap.get(medId) || 0;
      const salesHistory = medicineSales.get(medId) || {};
      
      // Lấy thông tin nhà cung cấp liên kết
      const supplier = med.supplierId ? supplierMap.get(med.supplierId.toString()) : null;
      
      // Các thuộc tính vận hành (Lead Time & MOQ) thuộc quan hệ Supplier
      const leadTime = supplier && supplier.leadTime !== undefined ? supplier.leadTime : 3; // ngày cung ứng mặc định
      const moq = supplier && supplier.moq !== undefined ? supplier.moq : 20; // số lượng đặt tối thiểu mặc định
      
      return {
        medicineId: medId,
        name: med.name,
        category: med.category || 'Chưa phân loại',
        cong_dung: med.cong_dung || 'Không có mô tả',
        unit: med.unit || 'Hộp',
        price: med.price || 0,
        currentStock,
        expectedIncoming,
        safetyStock: (med as any).safetyStock !== undefined ? (med as any).safetyStock : 50,
        reorderPoint: (med as any).reorderPoint !== undefined ? (med as any).reorderPoint : 100,
        leadTime,
        moq,
        supplierName: supplier ? supplier.name : 'Nhà cung cấp vãng lai',
        salesHistory
      };
    });
    
    // Lọc bỏ những mặt hàng không hoạt động (không có tồn kho, không có đơn hàng dự kiến và không có lịch sử bán) để tối ưu kích thước gói tin gửi qua Kafka
    const filteredDataset = dataset.filter(item => {
      const hasSales = Object.values(item.salesHistory).some((v: any) => {
        const qty = typeof v === 'object' && v !== null ? v.quantity : Number(v || 0);
        return qty > 0;
      });
      return item.currentStock > 0 || hasSales || item.expectedIncoming > 0;
    });

    return filteredDataset;
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
