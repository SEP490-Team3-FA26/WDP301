import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ReportsService } from './reports.service';

@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @MessagePattern('inventory.report.create')
  async createReportRecord(@Payload() data: any) {
    return await this.reportsService.createReportRecord(data);
  }

  @MessagePattern('inventory.report.list')
  async getReportHistory(@Payload() query: any) {
    return await this.reportsService.getReportHistory(query);
  }

  @MessagePattern('inventory.reports.forecast_dataset')
  async getForecastDataset(@Payload() data: { periodDays?: number; branchId?: string }) {
    return await this.reportsService.getForecastDataset(data?.periodDays, data?.branchId);
  }
}
