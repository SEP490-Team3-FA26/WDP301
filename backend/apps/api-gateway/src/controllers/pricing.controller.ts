import { Controller, Get, Put, Post, Delete, Param, Body, Query, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('💰 Pricing')
@Controller('api/pricing')
export class PricingGatewayController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    @Inject('USER_SERVICE') private readonly userClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.pricing.list',
      'inventory.pricing.upsert',
      'inventory.pricing.bulk_upsert',
      'inventory.pricing.delete',
      'inventory.pricing.resolve',
      'inventory.pricing.copy',
      'inventory.pricing.summary',
    ]);
    await subscribeToKafkaTopics(this.userClient, [
      'user.branch.list',
    ]);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Lấy tổng hợp bảng giá tất cả chi nhánh' })
  async getPriceSummary() {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.pricing.summary', {});
  }

  @Get('resolve')
  @ApiOperation({ summary: 'Resolve giá cuối cùng theo chi nhánh + loại bán + số lượng' })
  @ApiQuery({ name: 'branchId', required: true, type: String })
  @ApiQuery({ name: 'medicineId', required: true, type: String })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'RETAIL | WHOLESALE' })
  @ApiQuery({ name: 'quantity', required: false, type: Number })
  async resolvePrice(
    @Query('branchId') branchId: string,
    @Query('medicineId') medicineId: string,
    @Query('type') type: string = 'RETAIL',
    @Query('quantity') quantity: number = 1,
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.pricing.resolve', {
      branchId,
      medicineId,
      type,
      quantity: Number(quantity),
    });
  }

  @Post('copy')
  @ApiOperation({ summary: 'Sao chép bảng giá từ chi nhánh này sang chi nhánh khác' })
  async copyPriceList(@Body() data: { fromBranchId: string; toBranchId: string; updatedBy?: string }) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.pricing.copy', data);
  }

  @Post('sync-all')
  @ApiOperation({ summary: 'Đồng bộ bảng giá từ 1 chi nhánh sang TẤT CẢ các chi nhánh khác' })
  async syncPriceListToAll(@Body() data: { fromBranchId: string; updatedBy?: string }) {
    // 1. Lấy danh sách tất cả chi nhánh
    const branches = await sendKafkaMessage(this.userClient, 'user.branch.list', {});
    
    // 2. Lọc ra các chi nhánh khác với chi nhánh gốc
    const targetBranches = branches.filter((b: any) => b._id !== data.fromBranchId && b.id !== data.fromBranchId);
    
    if (targetBranches.length === 0) {
      return { status: 'Success', message: 'Không có chi nhánh đích nào để đồng bộ.' };
    }

    // 3. Gửi lệnh copy song song cho tất cả chi nhánh đích
    const promises = targetBranches.map((branch: any) => 
      sendKafkaMessage(this.inventoryClient, 'inventory.pricing.copy', {
        fromBranchId: data.fromBranchId,
        toBranchId: branch._id || branch.id,
        updatedBy: data.updatedBy,
      })
    );

    await Promise.allSettled(promises);

    return { 
      status: 'Success', 
      message: `Đã đồng bộ giá thành công tới ${targetBranches.length} chi nhánh.`,
      syncedCount: targetBranches.length
    };
  }

  @Get(':branchId')
  @ApiOperation({ summary: 'Lấy bảng giá của 1 chi nhánh' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getPriceListByBranch(
    @Param('branchId') branchId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search: string = '',
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.pricing.list', {
      branchId,
      page: Number(page),
      limit: Number(limit),
      search,
    });
  }

  @Put(':branchId/:medicineId')
  @ApiOperation({ summary: 'Tạo/cập nhật giá 1 thuốc tại 1 chi nhánh' })
  async upsertPrice(
    @Param('branchId') branchId: string,
    @Param('medicineId') medicineId: string,
    @Body() data: any,
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.pricing.upsert', {
      branchId,
      medicineId,
      ...data,
    });
  }

  @Post(':branchId/bulk')
  @ApiOperation({ summary: 'Import hàng loạt giá cho chi nhánh' })
  async bulkUpsertPrices(
    @Param('branchId') branchId: string,
    @Body() data: any,
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.pricing.bulk_upsert', {
      branchId,
      ...data,
    });
  }

  @Delete(':branchId/:medicineId')
  @ApiOperation({ summary: 'Xóa override giá (chi nhánh dùng giá mặc định)' })
  async deletePrice(
    @Param('branchId') branchId: string,
    @Param('medicineId') medicineId: string,
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.pricing.delete', {
      branchId,
      medicineId,
    });
  }
}
