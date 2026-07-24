import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { ReportsService } from './reports.service';

@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @MessagePattern('inventory.report.create')
  async createReportRecord(@Payload() data: any) {
    try {
      return await this.reportsService.createReportRecord(data);
    } catch (error: any) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi tạo lịch sử báo cáo');
    }
  }

  @MessagePattern('inventory.report.list')
  async getReportHistory(@Payload() query: any) {
    try {
      return await this.reportsService.getReportHistory(query);
    } catch (error: any) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi lấy lịch sử báo cáo');
    }
  }

  @MessagePattern('inventory.reports.forecast_dataset')
  async getForecastDataset(@Payload() data: { periodDays?: number; branchId?: string }) {
    try {
      return await this.reportsService.getForecastDataset(data?.periodDays, data?.branchId);
    } catch (error: any) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi lấy dữ liệu dự báo AI');
    }
  }

  @MessagePattern('inventory.reports.seasonal_trends')
  async getSeasonalDataset(@Payload() data: { branchId?: string; monthsCount?: number }) {
    try {
      return await this.reportsService.getSeasonalDataset(data?.branchId, data?.monthsCount);
    } catch (error: any) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi lấy dữ liệu xu hướng mùa');
    }
  }
}
