import { Controller, Get, Post, Param, Body, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('📋 Inventory Checks')
@Controller('api/inventory-checks')
export class InventoryCheckController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.check.create',
      'inventory.check.list',
      'inventory.check.get_by_id',
      'inventory.check.complete',
    ]);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo biên bản kiểm kê kho mới (Draft hoặc Completed)' })
  async createCheck(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.check.create', data);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách biên bản kiểm kê kho' })
  async listChecks() {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.check.list', {});
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết biên bản kiểm kê kho' })
  async getCheckById(@Param('id') id: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.check.get_by_id', { id });
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Hoàn tất biên bản kiểm kê kho và điều chỉnh số lượng tồn kho' })
  async completeCheck(@Param('id') id: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.check.complete', { id });
  }
}
