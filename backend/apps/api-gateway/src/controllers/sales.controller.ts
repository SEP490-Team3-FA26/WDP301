import { Controller, Post, Get, Body, Param, Query, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuditLogAction } from '../decorators/audit-log.decorator';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Controller('api/sales')
@UseGuards(JwtAuthGuard)
export class SalesController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.sale.create',
      'inventory.sale.list',
      'inventory.sale.get',
      'inventory.sale.return',
      'inventory.sale.exchange',
    ]);
  }

  @Post()
  @AuditLogAction({
    actionCode: 'SALES_CREATE',
    actionName: 'Bán lẻ thuốc tại quầy',
    module: 'Sales',
    eventType: 'CREATE',
    entityType: 'SalesOrder',
  })
  async createSalesOrder(@Body() data: any) {
    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.sale.create', data);
    
    // Evict seasonal analysis cache on sales changes
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const branch = data.branchId || 'all';
      await this.cacheManager.del(`reports:seasonal-analysis:${branch}:${currentMonth}`);
      await this.cacheManager.del(`reports:seasonal-analysis:all:${currentMonth}`);
      console.log(`🗑️ [Cache Evict] Evicted seasonal analysis cache for branch ${branch}`);
    } catch (err) {
      console.error('Lỗi xóa cache trong SalesController:', err);
    }

    return result;
  }

  @Get()
  async listSalesOrders(@Query('search') search?: string, @Query('type') type?: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sale.list', { search, type });
  }

  @Get(':id')
  async getSalesOrderById(@Param('id') id: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sale.get', { id });
  }

  @Post('return')
  async processReturn(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sale.return', data);
  }

  @Post('exchange')
  async processExchange(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.sale.exchange', data);
  }
}
