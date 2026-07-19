import { Controller, Get, Post, Query, Req, UseGuards, Inject, OnModuleInit, InternalServerErrorException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { S3StorageService } from '../storage/s3-storage.service';
import { ReportService } from '../services/report.service';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { randomUUID } from 'crypto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

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
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.sale.report',
      'inventory.sale.performance',
      'inventory.report.create',
      'inventory.report.list',
      'inventory.reports.forecast_dataset',
      'inventory.medicine.stats',
      'inventory.reports.seasonal_trends',
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

  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Lấy dữ liệu tóm tắt Dashboard tổng hợp' })
  @ApiQuery({ name: 'branchId', required: false })
  async getDashboardSummary(
    @Query('branchId') branchId?: string,
    @Req() req?: any,
  ) {
    const user = req.user;
    let targetBranchId = branchId;

    if (user.role !== 'admin' && user.role !== 'head_branch') {
      if (branchId && branchId !== user.branchId) {
        throw new ForbiddenException('Bạn không có quyền truy cập dữ liệu của chi nhánh khác');
      }
      targetBranchId = user.branchId;
    } else {
      if (!targetBranchId) {
        targetBranchId = user.branchId || 'all';
      }
    }

    const reportDate = new Date().toISOString().split('T')[0];

    try {
      const [revenueData, inventoryStats] = await Promise.all([
        sendKafkaMessage(this.inventoryClient, 'inventory.sale.report', {
          branchId: targetBranchId,
          period: 'month',
          date: reportDate,
        }),
        sendKafkaMessage(this.inventoryClient, 'inventory.medicine.stats', {
          branchId: targetBranchId,
        }),
      ]);

      if (!revenueData || revenueData.error) {
        throw new InternalServerErrorException(revenueData?.message || 'Không thể lấy dữ liệu báo cáo doanh thu');
      }

      if (!inventoryStats || inventoryStats.error) {
        throw new InternalServerErrorException(inventoryStats?.message || 'Không thể lấy thống kê tồn kho');
      }

      const totalRevenue = revenueData.summary?.netRevenue || 0;
      const totalOrders = revenueData.orders?.length || 0;
      const avgOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

      return {
        success: true,
        data: {
          revenue: {
            netRevenue: totalRevenue,
            totalOrders,
            avgOrder,
          },
          inventory: {
            totalMedicines: inventoryStats.totalMedicines || 0,
            totalStock: inventoryStats.totalStock || 0,
            totalValue: inventoryStats.totalValue || 0,
            lowStockCount: inventoryStats.lowStockCount || 0,
            outOfStockCount: inventoryStats.outOfStockCount || 0,
            expiredCount: inventoryStats.expiredCount || 0,
            soonToExpireCount: inventoryStats.soonToExpireCount || 0,
          }
        }
      };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new InternalServerErrorException(error.message || 'Lỗi hệ thống khi lấy dữ liệu tóm tắt Dashboard');
    }
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
      if (branchId && branchId !== user.branchId) {
        throw new ForbiddenException('Bạn không có quyền truy cập dữ liệu của chi nhánh khác');
      }
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
      if (branchId && branchId !== user.branchId) {
        throw new ForbiddenException('Bạn không có quyền truy cập dữ liệu của chi nhánh khác');
      }
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

  @Get('inventory-performance')
  @ApiOperation({ summary: 'Báo cáo hàng bán chạy và chậm luân chuyển' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD' })
  async getInventoryPerformance(
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Req() req?: any,
  ) {
    const user = req.user;
    let targetBranchId = branchId;

    if (user.role !== 'admin' && user.role !== 'head_branch') {
      if (branchId && branchId !== user.branchId) {
        throw new ForbiddenException('Bạn không có quyền truy cập dữ liệu của chi nhánh khác');
      }
      targetBranchId = user.branchId;
    }

    try {
      const data = await sendKafkaMessage(this.inventoryClient, 'inventory.sale.performance', {
        branchId: targetBranchId,
        startDate,
        endDate
      });

      return {
        success: true,
        data
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message || 'Lỗi lấy báo cáo hiệu suất');
    }
  }

  @Get('ai-forecast')
  @ApiOperation({ summary: 'Dự báo nhu cầu nhập hàng theo kỳ bằng AI' })
  @ApiQuery({ name: 'periodDays', required: false, description: 'Số ngày phân tích kỳ trước, mặc định là 30' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Chi nhánh cần dự báo' })
  async getAIForecast(
    @Query('periodDays') periodDays?: string,
    @Query('branchId') branchId?: string,
    @Req() req?: any,
  ) {
    const user = req.user;
    let targetBranchId = branchId;
    if (user.role !== 'admin' && user.role !== 'head_branch') {
      targetBranchId = user.branchId;
    }

    const days = periodDays ? Number(periodDays) : 30;

    try {
      // 1. Lấy dữ liệu thô từ inventory service
      const rawDataset = await sendKafkaMessage(this.inventoryClient, 'inventory.reports.forecast_dataset', {
        periodDays: days,
        branchId: targetBranchId,
      });

      if (!rawDataset || rawDataset.error) {
        throw new InternalServerErrorException(rawDataset?.message || 'Không thể lấy dữ liệu phân tích kho');
      }

      let aiUrl = 'http://ai-service:8000/api/ai/forecast';
      try {
        const response = await fetch(aiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataset: rawDataset, periodDays: days }),
        });

        if (response.ok) {
          return await response.json();
        }
        throw new Error(await response.text());
      } catch (err) {
        aiUrl = 'http://localhost:8000/api/ai/forecast';
        const response = await fetch(aiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataset: rawDataset, periodDays: days }),
        });

        if (response.ok) {
          return await response.json();
        }
        throw new Error(await response.text());
      }
    } catch (error) {
      throw new InternalServerErrorException(error.message || 'Lỗi hệ thống khi tạo dự báo nhu cầu bằng AI');
    }
  }

  @Get('seasonal-analysis')
  @ApiOperation({ summary: 'Phân tích xu hướng bán hàng theo mùa và nguy cơ dịch bệnh bằng AI' })
  @ApiQuery({ name: 'branchId', required: false, description: 'Chi nhánh cần phân tích' })
  async getSeasonalAnalysis(
    @Query('branchId') branchId?: string,
    @Req() req?: any,
  ) {
    const user = req.user;
    let targetBranchId = branchId;
    if (user.role !== 'admin' && user.role !== 'head_branch') {
      targetBranchId = user.branchId;
    }

    const target = targetBranchId || 'all';
    const currentMonth = new Date().toISOString().slice(0, 7);
    const cacheKey = `reports:seasonal-analysis:${target}:${currentMonth}`;

    try {
      // 1. Kiểm tra Redis Cache phân tán
      const cachedData = await this.cacheManager.get(cacheKey);
      if (cachedData) {
        console.log(`⚡ [Cache Hit] Lấy phân tích xu hướng mùa cho chi nhánh ${target} từ Redis`);
        return {
          success: true,
          cache_hit: true,
          data: cachedData,
        };
      }

      console.log(`❌ [Cache Miss] Chạy phân tích xu hướng mùa cho chi nhánh ${target}`);

      // 2. Lấy dữ liệu bán hàng 12 tháng từ inventory service
      const rawDataset = await sendKafkaMessage(this.inventoryClient, 'inventory.reports.seasonal_trends', {
        branchId: targetBranchId,
        monthsCount: 12,
      });

      if (!rawDataset || rawDataset.error) {
        throw new InternalServerErrorException(rawDataset?.message || 'Không thể lấy dữ liệu bán hàng lịch sử');
      }

      // 3. Lấy thông tin chi nhánh để xác định vùng thời tiết
      let branchAddress = '';
      if (targetBranchId && targetBranchId !== 'all') {
        try {
          const branches = await sendKafkaMessage(this.userClient, 'user.branch.list', {});
          if (Array.isArray(branches)) {
            const found = branches.find((b: any) => b.branchCode === targetBranchId);
            if (found) {
              branchAddress = found.address || found.name || '';
            }
          }
        } catch (err) {
          // non-blocking
        }
      }

      // Xác định vùng địa lý
      let weatherRegion: 'North' | 'Central' | 'South' = 'South';
      const text = branchAddress.toLowerCase();
      if (text.includes('hà nội') || text.includes('hn') || text.includes('quảng ninh') || text.includes('hải phòng') || text.includes('bắc')) {
        weatherRegion = 'North';
      } else if (text.includes('đà nẵng') || text.includes('huế') || text.includes('quảng nam') || text.includes('khánh hòa') || text.includes('trung')) {
        weatherRegion = 'Central';
      }

      // Xác định mùa khí hậu dựa theo vùng miền
      const monthNum = new Date().getMonth() + 1; // 1 - 12
      let currentSeason = 'Rainy';
      if (weatherRegion === 'North') {
        if (monthNum >= 2 && monthNum <= 4) currentSeason = 'Spring';
        else if (monthNum >= 5 && monthNum <= 7) currentSeason = 'Summer';
        else if (monthNum >= 8 && monthNum <= 10) currentSeason = 'Autumn';
        else currentSeason = 'Winter';
      } else if (weatherRegion === 'Central') {
        if (monthNum >= 9 && monthNum <= 12) currentSeason = 'Rainy';
        else currentSeason = 'Dry';
      } else {
        if (monthNum >= 5 && monthNum <= 11) currentSeason = 'Rainy';
        else currentSeason = 'Dry';
      }

      // 4. Gọi Python AI Service để thực hiện dự báo và phân tích
      let aiUrl = 'http://ai-service:8000/api/ai/seasonal-analysis';
      let aiResponse;
      try {
        aiResponse = await fetch(aiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataset: rawDataset, weatherRegion, currentSeason, currentMonth }),
        });
      } catch (err) {
        aiUrl = 'http://localhost:8000/api/ai/seasonal-analysis';
        aiResponse = await fetch(aiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataset: rawDataset, weatherRegion, currentSeason, currentMonth }),
        });
      }

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(errorText || 'Không thể kết nối đến AI Service');
      }

      const aiResult = await aiResponse.json();

      // 5. Lưu vào cache Redis với TTL 24 giờ
      await this.cacheManager.set(cacheKey, aiResult, 24 * 3600 * 1000);

      return {
        success: true,
        cache_hit: false,
        data: aiResult,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message || 'Lỗi hệ thống khi phân tích xu hướng bán hàng bằng AI');
    }
  }

  @Post('seasonal-analysis/evict')
  @ApiOperation({ summary: 'Xóa cache phân tích xu hướng bán hàng của chi nhánh' })
  @ApiQuery({ name: 'branchId', required: false })
  async evictSeasonalCache(
    @Query('branchId') branchId?: string,
    @Req() req?: any,
  ) {
    const user = req.user;
    let targetBranchId = branchId;
    if (user.role !== 'admin' && user.role !== 'head_branch') {
      targetBranchId = user.branchId;
    }

    const target = targetBranchId || 'all';
    const currentMonth = new Date().toISOString().slice(0, 7);
    const cacheKey = `reports:seasonal-analysis:${target}:${currentMonth}`;

    try {
      await this.cacheManager.del(cacheKey);
      if (target !== 'all') {
        await this.cacheManager.del(`reports:seasonal-analysis:all:${currentMonth}`);
      }
      return {
        success: true,
        message: `Đã xóa thành công cache phân tích của chi nhánh ${target}`,
      };
    } catch (error) {
      throw new InternalServerErrorException(error.message || 'Lỗi khi xóa cache');
    }
  }
}
