import { Controller, Get, Post, Query, UseInterceptors, Param, Body, Patch, Inject, OnModuleInit, HttpException, HttpStatus } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';

@ApiTags('💊 Medicines')
@Controller('api/medicines')
export class MedicineController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.medicine.list',
      'inventory.medicine.get_by_id',
      'inventory.medicine.update_status',
      'inventory.medicine.update_price_tiers',
      'inventory.medicine.get_filters',
      'inventory.medicine.stats',
      'inventory.medicine.expiration_report',
      'inventory.medicine.low_stock_report',
      'inventory.medicine.dropdown_list',
      'inventory.medicine.get_alternatives',
    ]);
  }

  @Get('filters')
  @ApiOperation({ summary: 'Lấy danh sách các bộ lọc có sẵn' })
  async getFilters() {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.get_filters', {});
  }

  @Get('stats')
  @ApiOperation({ summary: 'Lấy thống kê tồn kho' })
  async getStats() {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.stats', {});
  }

  @Get('expiration-report')
  @ApiOperation({ summary: 'Lấy báo cáo hết hạn của các lô hàng' })
  async getExpirationReport() {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.expiration_report', {});
  }

  @Get('low-stock-report')
  @ApiOperation({ summary: 'Lấy báo cáo các loại thuốc sắp hết hàng hoặc hết hàng' })
  async getLowStockReport() {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.low_stock_report', {});
  }

  @Get('dropdown')
  @ApiOperation({ summary: 'Lấy danh sách tối giản của các loại thuốc phục vụ cho dropdown' })
  async getMedicinesDropdown() {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.dropdown_list', {});
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
  @ApiOperation({ summary: 'Cập nhật trạng thái / tồn kho của thuốc' })
  async updateMedicineStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('stock') stock?: number
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.update_status', { id, status, stock });
  }

  @Patch(':id/price-tiers')
  @ApiOperation({ summary: 'Cập nhật bảng giá sỉ bậc thang của thuốc' })
  async updateMedicinePriceTiers(
    @Param('id') id: string,
    @Body('priceTiers') priceTiers: { minQuantity: number; price: number }[]
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.update_price_tiers', { id, priceTiers });
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

  @Post('check-interaction')
  @ApiOperation({ summary: 'Kiểm tra tương tác giữa các loại thuốc (AI-driven)' })
  async checkInteraction(@Body('medicines') medicines: string[]) {
    if (!medicines || medicines.length < 2) {
      throw new HttpException('Cần ít nhất 2 loại thuốc để kiểm tra tương tác', HttpStatus.BAD_REQUEST);
    }
    
    try {
      const response = await fetch('http://ai-service:8000/api/ai/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ medicines }),
      });

      if (!response.ok) {
        throw new HttpException('Failed to check interactions from AI Service', HttpStatus.BAD_GATEWAY);
      }

      return await response.json();
    } catch (error) {
      throw new HttpException(error.message || 'Lỗi khi gọi AI Service', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
