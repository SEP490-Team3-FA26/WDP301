import { Controller, Get, Post, Query, UseInterceptors, Param, Body, Patch, Inject, OnModuleInit, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { AuditLogAction } from '../decorators/audit-log.decorator';

@ApiTags('💊 Medicines')
@Controller('api/medicines')
export class MedicineController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
  ) { }

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.medicine.list',
      'inventory.medicine.get_by_id',
      'inventory.medicine.update_status',
      'inventory.medicine.update_price_tiers',
      'inventory.medicine.get_filters',
      'inventory.medicine.stats',
      'inventory.medicine.expiration_report',
      'inventory.medicine.handle_expiration_action',
      'inventory.medicine.low_stock_report',
      'inventory.medicine.dropdown_list',
      'inventory.medicine.get_alternatives',
      'inventory.medicine.update_price',
      'inventory.medicine.safe_stock_chain',
      'inventory.medicine.detect_anomalies',
      'inventory.medicine.branch_list',
    ]);
  }

  @Get('filters')
  @ApiOperation({ summary: 'Lấy danh sách các bộ lọc có sẵn' })
  async getFilters() {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.get_filters', {});
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thống kê tồn kho' })
  async getStats() {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.stats', {});
  }

  @Get('expiration-report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy báo cáo hết hạn của các lô hàng' })
  async getExpirationReport() {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.expiration_report', {});
  }

  @Post('expiration-action')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Xử lý đề xuất xử lý thuốc sắp hết hạn (Xuất hủy, Trả NCC, Giảm giá)' })
  async handleExpirationAction(@Body() body: {
    batchId: string;
    action: 'DISPOSE' | 'RETURN_SUPPLIER' | 'DISCOUNT';
    quantity: number;
    notes?: string;
    discountPrice?: number;
    performedBy?: string;
  }) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.handle_expiration_action', body);
  }

  @Get('low-stock-report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy báo cáo các loại thuốc sắp hết hàng hoặc hết hàng' })
  async getLowStockReport() {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.low_stock_report', {});
  }

  @Get('dropdown')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách tối giản của các loại thuốc phục vụ cho dropdown' })
  async getMedicinesDropdown() {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.dropdown_list', {});
  }

  // UC-30: Tồn kho thời gian thực toàn chuỗi + Thuật toán tồn kho an toàn
  @Get('safe-stock-chain')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[UC-30] Xem tồn kho thời gian thực toàn chuỗi + phân tích an toàn' })
  @ApiQuery({ name: 'serviceLevel', required: false, type: Number, description: 'Mức phục vụ: 0.90/0.95/0.98/0.99', example: 0.95 })
  @ApiQuery({ name: 'periodDays', required: false, type: Number, description: 'Kỳ phân tích (ngày)', example: 30 })
  @ApiQuery({ name: 'branchId', required: false, type: String, description: 'Lọc theo chi nhánh' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSafeStockChain(
    @Query('serviceLevel') serviceLevel?: number,
    @Query('periodDays') periodDays?: number,
    @Query('branchId') branchId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.safe_stock_chain', {
      serviceLevel: serviceLevel ? Number(serviceLevel) : 0.95,
      periodDays: periodDays ? Number(periodDays) : 30,
      branchId: branchId || undefined,
      page: Number(page),
      limit: Number(limit),
    });
  }

  // UC-37: Phát hiện bất thường tồn kho (Z-Score / 3-Sigma Thống Kê Thuần Túy)
  @Get('anomaly-detection')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '[UC-37] Phát hiện bất thường tồn kho bằng Z-Score / 3-Sigma' })
  @ApiQuery({ name: 'periodDays', required: false, type: Number, description: 'Kỳ phân tích (ngày)', example: 60 })
  @ApiQuery({ name: 'zScoreThreshold', required: false, type: Number, description: 'Ngưỡng Z-Score (mặc định: 3)', example: 3 })
  async getAnomalyDetection(
    @Query('periodDays') periodDays?: number,
    @Query('zScoreThreshold') zScoreThreshold?: number,
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.detect_anomalies', {
      periodDays: periodDays ? Number(periodDays) : 60,
      zScoreThreshold: zScoreThreshold ? Number(zScoreThreshold) : 3,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết 1 loại thuốc' })
  async getMedicineById(@Param('id') id: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.get_by_id', { id });
  }

  @Get(':id/alternatives')
  @ApiOperation({ summary: 'Tìm các loại thuốc thay thế (UC-36)' })
  @ApiQuery({ name: 'branchId', required: true, type: String })
  async getAlternatives(@Param('id') id: string, @Query('branchId') branchId: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.get_alternatives', { medicineId: id, branchId });
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật trạng thái / tồn kho của thuốc' })
  @AuditLogAction({
    actionCode: 'MEDICINE_STATUS_UPDATE',
    actionName: 'Cập nhật trạng thái thuốc',
    module: 'Inventory',
    eventType: 'UPDATE',
    entityType: 'Medicine',
  })
  async updateMedicineStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('stock') stock?: number
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.update_status', { id, status, stock });
  }

  @Patch(':id/price-tiers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật bảng giá sỉ bậc thang của thuốc' })
  @AuditLogAction({
    actionCode: 'MEDICINE_PRICE_TIERS_UPDATE',
    actionName: 'Cập nhật giá sỉ thuốc',
    module: 'Inventory',
    eventType: 'UPDATE',
    entityType: 'Medicine',
  })
  async updateMedicinePriceTiers(
    @Param('id') id: string,
    @Body('priceTiers') priceTiers: { minQuantity: number; price: number }[]
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.update_price_tiers', { id, priceTiers });
  }

  @Patch(':id/price')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cập nhật giá bán chung của thuốc' })
  async updateMedicinePrice(
    @Param('id') id: string,
    @Body('price') price: number
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.update_price', { id, price });
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thuốc (kết nối Mongoose & Vector DB)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'classification', required: false, type: String })
  @ApiQuery({ name: 'targetGroup', required: false, type: String })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'flavour', required: false, type: String })
  @ApiQuery({ name: 'country', required: false, type: String })
  @ApiQuery({ name: 'brand', required: false, type: String })
  @ApiQuery({ name: 'indication', required: false, type: String })
  @ApiQuery({ name: 'brandOrigin', required: false, type: String })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  async getMedicines(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search = '',
    @Query('category') category = '',
    @Query('classification') classification = '',
    @Query('targetGroup') targetGroup = '',
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('flavour') flavour = '',
    @Query('country') country = '',
    @Query('brand') brand = '',
    @Query('indication') indication = '',
    @Query('brandOrigin') brandOrigin = '',
    @Query('branchId') branchId = '',
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.list', {
      page: Number(page),
      limit: Number(limit),
      search,
      category,
      classification,
      targetGroup,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      flavour,
      country,
      brand,
      indication,
      brandOrigin,
      branchId,
    });
  }

  @Get('branch/:branchId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy danh sách thuốc và tồn kho riêng của chi nhánh' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'classification', required: false, type: String })
  @ApiQuery({ name: 'targetGroup', required: false, type: String })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'flavour', required: false, type: String })
  @ApiQuery({ name: 'country', required: false, type: String })
  @ApiQuery({ name: 'brand', required: false, type: String })
  @ApiQuery({ name: 'indication', required: false, type: String })
  @ApiQuery({ name: 'brandOrigin', required: false, type: String })
  @ApiQuery({ name: 'branchStockOnly', required: false, type: Boolean })
  async getBranchMedicines(
    @Param('branchId') branchId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search = '',
    @Query('category') category = '',
    @Query('classification') classification = '',
    @Query('targetGroup') targetGroup = '',
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('flavour') flavour = '',
    @Query('country') country = '',
    @Query('brand') brand = '',
    @Query('indication') indication = '',
    @Query('brandOrigin') brandOrigin = '',
    @Query('branchStockOnly') branchStockOnly?: boolean,
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.branch_list', {
      branchId,
      branchStockOnly,
      page: Number(page),
      limit: Number(limit),
      search,
      category,
      classification,
      targetGroup,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      flavour,
      country,
      brand,
      indication,
      brandOrigin,
    });
  }

  @Post('check-interaction')
  @ApiOperation({ summary: 'Kiểm tra tương tác giữa các loại thuốc (AI-driven)' })
  async checkInteraction(@Body('medicines') medicines: string[]) {
    if (!medicines || medicines.length < 2) {
      throw new HttpException('Cần ít nhất 2 loại thuốc để kiểm tra tương tác', HttpStatus.BAD_REQUEST);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch('http://ai-service:8000/api/ai/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': process.env.JWT_SECRET || 'wdp301-super-secret-key-change-in-production',
        },
        body: JSON.stringify({ medicines }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new HttpException('Failed to check interactions from AI Service', HttpStatus.BAD_GATEWAY);
      }

      return await response.json();
    } catch (error) {
      throw new HttpException(error.message || 'Lỗi khi gọi AI Service', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

}

