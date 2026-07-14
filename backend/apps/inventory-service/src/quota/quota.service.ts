import { Injectable, NotFoundException, ConflictException, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Quota, QuotaDocument } from './schemas/quota.schema';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage } from '../../../api-gateway/src/common/kafka.helper';

@Injectable()
export class QuotaService implements OnModuleInit {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    @InjectModel(Quota.name) private readonly quotaModel: Model<QuotaDocument>,
    @Inject('USER_SERVICE') private readonly userClient: ClientKafka,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.quotaModel.countDocuments().exec();
      if (count === 0) {
        this.logger.log('🌱 Bắt đầu seeding dữ liệu hạn mức mẫu từ chi nhánh thực tế...');
        
        // Gọi sang user-service lấy danh sách chi nhánh thực tế thông qua Kafka helper quy chuẩn
        const branches = await sendKafkaMessage(this.userClient, 'user.branch.list', {});


        if (branches && branches.length > 0) {
          const seedQuotas = branches.map((b: any, index: number) => {
            const budgets = [500000000, 300000000, 200000000, 600000000];
            const usedAmounts = [120000000, 85000000, 0, 320000000];
            return {
              branchId: b.branchCode,
              branchName: b.name,
              cycle: '2026-07',
              totalBudget: budgets[index % budgets.length],
              usedAmount: usedAmounts[index % usedAmounts.length],
              status: 'Active',
              note: 'Hạn mức nhập hàng tháng 7 (được lấy tự động từ database chi nhánh)',
            };
          });

          await this.quotaModel.insertMany(seedQuotas);
          this.logger.log(`✅ Đã seed thành công ${seedQuotas.length} dữ liệu hạn mức mẫu từ database chi nhánh!`);
        } else {
          this.logger.warn('⚠️ Không tìm thấy chi nhánh nào từ user-service để seed hạn mức.');
        }
      }
    } catch (error) {
      this.logger.error('❌ Lỗi khi seed dữ liệu hạn mức từ database chi nhánh:', error);
    }
  }


  async create(data: any): Promise<Quota> {
    try {
      const newQuota = new this.quotaModel(data);
      return await newQuota.save();
    } catch (error: any) {
      if (error.code === 11000) {
         throw new ConflictException('Hạn mức cho chi nhánh trong chu kỳ này đã tồn tại!');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Quota> {
    const quota = await this.quotaModel.findById(id).exec();
    if (!quota) {
      throw new NotFoundException(`Quota với ID ${id} không tồn tại!`);
    }
    return quota;
  }

  async findByBranch(branchId: string): Promise<Quota[]> {
    return this.quotaModel.find({ branchId }).sort({ cycle: -1 }).exec();
  }

  async findAll(query?: any): Promise<Quota[]> {
    const filter: any = {};
    if (query) {
      if (query.branchId) filter.branchId = query.branchId;
      if (query.cycle) filter.cycle = query.cycle;
      if (query.status) filter.status = query.status;
    }
    return this.quotaModel.find(filter).sort({ cycle: -1, branchId: 1 }).exec();
  }

  async getSummary(query?: any): Promise<any> {
    const filter: any = {};
    if (query && query.cycle) {
      filter.cycle = query.cycle;
    } else {
      // Mặc định lấy chu kỳ hiện tại dạng YYYY-MM
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      filter.cycle = `${year}-${month}`;
    }

    const quotas = await this.quotaModel.find(filter).exec();
    
    let totalBudget = 0;
    let totalUsed = 0;
    const branchCount = quotas.length;

    quotas.forEach(q => {
      totalBudget += q.totalBudget || 0;
      totalUsed += q.usedAmount || 0;
    });

    return {
      cycle: filter.cycle,
      totalBudget,
      totalUsed,
      totalRemaining: totalBudget - totalUsed,
      branchCount,
    };
  }

  async update(id: string, data: any): Promise<Quota> {
    const updatedQuota = await this.quotaModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .exec();
    if (!updatedQuota) {
      throw new NotFoundException(`Không tìm thấy quota ${id} để cập nhật!`);
    }
    return updatedQuota;
  }

  async delete(id: string): Promise<void> {
    const result = await this.quotaModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Không tìm thấy quota ${id} để xóa!`);
    }
  }
}

