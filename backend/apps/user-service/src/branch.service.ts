import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Branch, BranchDocument } from './schemas/branch.schema';
import { User, UserDocument } from '../../auth-service/src/auth/user.schema';
import { MedicineBatch } from '../../inventory-service/src/medicine/schemas/medicine-batch.schema';

@Injectable()
export class BranchService {
  private readonly logger = new Logger(BranchService.name);

  constructor(
    @InjectModel(Branch.name)
    private readonly branchModel: Model<BranchDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(MedicineBatch.name)
    private readonly batchModel: Model<MedicineBatch>,
  ) {}

  async findAll(): Promise<any[]> {
    const branches = await this.branchModel.find().sort({ branchCode: 1 }).lean().exec();

    // Tính toán dữ liệu nhân sự & tồn kho thực tế từ DB cho từng chi nhánh
    const enrichedBranches = await Promise.all(
      branches.map(async (branch) => {
        const code = branch.branchCode;

        // 1. Đếm số nhân sự thuộc chi nhánh
        const employeeCount = await this.userModel.countDocuments({
          branchId: code,
          isApproved: { $ne: 'rejected' },
        }).exec();

        // 2. Tính tổng số tồn kho thực tế từ MedicineBatch
        const stockAggregate = await this.batchModel.aggregate([
          { $match: { branchId: code, status: 'ACTIVE', stock: { $gt: 0 } } },
          { $group: { _id: null, total: { $sum: '$stock' } } },
        ]).exec();

        const realTotalStock = stockAggregate.length > 0 ? stockAggregate[0].total : 0;

        // 3. Đếm số lô thuốc hết hạn hoặc sắp hết hạn (< 30 ngày)
        const now = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(now.getDate() + 30);

        const expiringCount = await this.batchModel.countDocuments({
          branchId: code,
          status: 'ACTIVE',
          stock: { $gt: 0 },
          expDate: { $lte: thirtyDaysLater },
        }).exec();

        return {
          ...branch,
          stats: {
            employees: employeeCount,
            totalStock: realTotalStock,
            lowStock: branch.stats?.lowStock || 0,
            expiring: expiringCount,
          },
        };
      })
    );

    return enrichedBranches;
  }

  async create(data: any): Promise<Branch> {
    const count = await this.branchModel.countDocuments().exec();
    // Auto-generate code if not provided
    if (!data.branchCode) {
      data.branchCode = `BR-${String(count + 1).padStart(3, '0')}`;
    }
    if (!data.image) {
      data.image = 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500&auto=format&fit=crop&q=60';
    }
    const newBranch = new this.branchModel(data);
    return newBranch.save();
  }

  async update(id: string, data: any): Promise<Branch | null> {
    return this.branchModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<any> {
    return this.branchModel.findByIdAndDelete(id).exec();
  }

  async handleLowStockAlert(data: { branchId: string; medicineId: string; medicineName: string; currentStock: number; minStock: number; timestamp: string }) {
    this.logger.warn(`Received low stock alert for branch ${data.branchId}: ${data.medicineName} (${data.currentStock} < ${data.minStock})`);
    
    const branch = await this.branchModel.findById(data.branchId).exec();
    if (!branch) return;

    const newAlert = {
      id: Date.now(),
      type: 'low_stock',
      item: data.medicineName,
      current: data.currentStock,
      min: data.minStock,
      time: 'Vừa xong (Từ quầy)',
    };

    branch.alerts = branch.alerts || [];
    // Thêm alert mới vào đầu danh sách
    branch.alerts.unshift(newAlert as any);
    
    // Cập nhật stats.lowStock
    branch.stats = branch.stats || { employees: 0, totalStock: 0, lowStock: 0, expiring: 0 };
    branch.stats.lowStock += 1;

    // Giữ lại tối đa 50 alerts
    if (branch.alerts.length > 50) {
      branch.alerts = branch.alerts.slice(0, 50);
    }

    await branch.save();
  }
}
