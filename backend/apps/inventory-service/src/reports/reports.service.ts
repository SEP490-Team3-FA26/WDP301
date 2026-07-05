import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Report } from './schemas/report.schema';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
  ) {}

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
