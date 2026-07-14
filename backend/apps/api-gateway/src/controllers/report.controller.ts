import { Controller, Get, Query, Req, UseGuards, Inject, OnModuleInit, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { S3StorageService } from '../storage/s3-storage.service';
import { ReportService } from '../services/report.service';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { randomUUID } from 'crypto';

@ApiTags('📊 Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/reports')
export class ReportController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    @Inject('USER_SERVICE') private readonly userClient: ClientKafka,
    private readonly storage: S3StorageService,
    private readonly reportService: ReportService,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.sale.report',
      'inventory.report.create',
      'inventory.report.list',
    ]);
  }

  @Get('history')
  @ApiOperation({ summary: 'Lấy lịch sử xuất báo cáo' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'type', required: false })
  async getHistory(
    @Query('branchId') branchId?: string,
    @Query('type') type?: string,
    @Req() req?: any,
  ) {
    const user = req.user;
    let targetBranchId = branchId;
    
    if (user.role !== 'admin' && user.role !== 'head_branch') {
      targetBranchId = user.branchId;
    }

    const reports = await this.storage.listReports(targetBranchId, type);
    return reports;
  }

  @Get('revenue/analytics')
  @ApiOperation({ summary: 'Lấy dữ liệu phân tích doanh thu (JSON only, không tạo PDF)' })
  @ApiQuery({ name: 'period', required: true, enum: ['day', 'week', 'month', 'quarter'] })
  @ApiQuery({ name: 'date', required: false, description: 'Định dạng YYYY-MM-DD, mặc định là hôm nay' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Chỉ áp dụng với Admin/HQ' })
  async getRevenueAnalytics(
    @Query('period') period: 'day' | 'week' | 'month' | 'quarter',
    @Query('date') date?: string,
    @Query('branchId') branchId?: string,
    @Req() req?: any,
  ) {
    const user = req.user;
    let targetBranchId = branchId;

    if (user.role !== 'admin' && user.role !== 'head_branch') {
      if (!user.branchId) {
        throw new BadRequestException('Tài khoản của bạn chưa được liên kết với chi nhánh nào');
      }
      targetBranchId = user.branchId;
    } else {
      if (!targetBranchId) {
        targetBranchId = user.branchId || 'all';
      }
    }

    const reportDate = date || new Date().toISOString().split('T')[0];

    try {
      const reportData = await sendKafkaMessage(this.inventoryClient, 'inventory.sale.report', {
        branchId: targetBranchId,
        period,
        date: reportDate,
      });

      if (!reportData || reportData.error) {
        throw new InternalServerErrorException(reportData?.message || 'Không thể lấy dữ liệu báo cáo doanh thu');
      }

      return {
        success: true,
        data: reportData,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message || 'Lỗi hệ thống khi lấy dữ liệu phân tích doanh thu');
    }
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Tạo báo cáo doanh thu theo ngày/tuần/tháng/quý và lưu trên S3 (Xuất PDF)' })
  @ApiQuery({ name: 'period', required: true, enum: ['day', 'week', 'month', 'quarter'] })
  @ApiQuery({ name: 'date', required: false, description: 'Định dạng YYYY-MM-DD, mặc định là hôm nay' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Chỉ áp dụng với Admin/HQ' })
  async getRevenueReport(
    @Query('period') period: 'day' | 'week' | 'month' | 'quarter',
    @Query('date') date?: string,
    @Query('branchId') branchId?: string,
    @Req() req?: any,
  ) {
    const user = req.user;
    let targetBranchId = branchId;

    // Enforce branch boundaries if not admin/hq
    if (user.role !== 'admin' && user.role !== 'head_branch') {
      if (!user.branchId) {
        throw new BadRequestException('Tài khoản của bạn chưa được liên kết với chi nhánh nào');
      }
      targetBranchId = user.branchId;
    } else {
      if (!targetBranchId) {
        targetBranchId = user.branchId || 'all';
      }
    }

    const reportDate = date || new Date().toISOString().split('T')[0];

    try {
      // 1. Fetch sales aggregation from inventory service
      const reportData = await sendKafkaMessage(this.inventoryClient, 'inventory.sale.report', {
        branchId: targetBranchId,
        period,
        date: reportDate,
      });

      if (!reportData || reportData.error) {
        throw new InternalServerErrorException(reportData?.message || 'Không thể lấy dữ liệu báo cáo doanh thu');
      }

      // 2. Fetch branch details from user service
      let branchInfo = null;
      try {
        const branches = await sendKafkaMessage(this.userClient, 'user.branch.list', {});
        if (Array.isArray(branches)) {
          branchInfo = branches.find((b: any) => b.branchCode === targetBranchId);
        }
      } catch (err) {
        // Non-blocking branch name fetch error
      }

      // 3. Generate PDF Report buffer via ReportService
      const pdfBuffer = await this.reportService.generateRevenuePdf(reportData, branchInfo, user.fullName);

      // 4. Upload PDF to S3
      const datePath = new Date().toISOString().slice(0, 10);
      const uuidStr = randomUUID();
      const key = `reports/revenue/${targetBranchId}/${period}_${datePath}_${uuidStr}.pdf`;
      await this.storage.uploadFile(pdfBuffer, key, 'application/pdf');

      // 5. Generate Presigned URL (valid for 7 days)
      const downloadUrl = await this.storage.getPresignedUrl(key, 86400 * 7);

      const periodName = period === 'day' ? 'ngày' : period === 'week' ? 'tuần' : period === 'month' ? 'tháng' : 'quý';
      const branchName = branchInfo ? branchInfo.name : targetBranchId;
      
      // 6. Save to DB
      const reportRecord = {
        reportCode: `REP-${Math.floor(100 + Math.random() * 900)}${uuidStr.split('-')[0].substring(0, 4)}`.toUpperCase(), // Mã định danh duy nhất (VD: REP-883A2C)
        name: `Báo cáo doanh thu ${periodName} - ${branchName}`, // Tên hiển thị (VD: Báo cáo doanh thu tháng - CN1)
        type: 'Doanh thu', // Loại báo cáo
        format: 'PDF', // Định dạng file
        size: `${(pdfBuffer.length / 1024).toFixed(1)} KB`, // Dung lượng file
        status: 'Hoàn thành', // Trạng thái xử lý
        author: user.fullName || 'Quản lý', // Người tạo
        downloadUrl, // Link S3 tải về
        branchId: targetBranchId, // Phân quyền xem theo chi nhánh
      };

      await sendKafkaMessage(this.inventoryClient, 'inventory.report.create', reportRecord);

      return {
        success: true,
        message: 'Tạo báo cáo doanh thu thành công!',
        s3Key: key,
        downloadUrl,
        data: reportData,
        record: reportRecord,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message || 'Lỗi hệ thống khi tạo báo cáo doanh thu');
    }
  }
}
