import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Quota, QuotaDocument } from './schemas/quota.schema';

@Injectable()
export class QuotaService {
  constructor(
    @InjectModel(Quota.name) private readonly quotaModel: Model<QuotaDocument>,
  ) {}

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

  async findAll(query?: any): Promise<Quota[]> {
    return this.quotaModel.find(query || {}).exec();
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
