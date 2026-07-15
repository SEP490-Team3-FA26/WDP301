import { Controller, Get, Post, Put, Delete, Body, Param, Inject, OnModuleInit, HttpStatus, HttpCode, Query } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';

@Controller('api/quotas')
export class QuotaController implements OnModuleInit {
  private readonly CACHE_TTL = 3600000;

  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.kafkaClient, [
      'quota.get.by.id',
      'quota.get.all',
    ]);
  }

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async createQuota(@Body() dto: { branchId: string; cycle: string; totalBudget: number; usedAmount?: number; status?: string }) {
    this.kafkaClient.emit('quota.event.create', JSON.stringify(dto));
  
    return {
      status: 'Accepted',
      message: 'Sự kiện tạo hạn mức đã được gửi vào hàng đợi Kafka để xử lý!',
    };
  }

  @Get(':id')
  async getQuotaById(@Param('id') id: string) {
    const cacheKey = `quota:${id}`;

    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      console.log(`⚡ [Cache Hit] Lấy hạn mức ${id} từ Redis`);
      return cachedData;
    }

    console.log(`❌ [Cache Miss] Lấy hạn mức ${id} qua Kafka -> Database`);
    const quota = await sendKafkaMessage(this.kafkaClient, 'quota.get.by.id', id);

    if (quota) {
      await this.cacheManager.set(cacheKey, quota, this.CACHE_TTL);
    }
    return quota;
  }

  @Get()
  async getAllQuotas(@Query() query: any) {
    return await sendKafkaMessage(this.kafkaClient, 'quota.get.all', JSON.stringify(query));
  }

  @Put(':id')
  async updateQuota(@Param('id') id: string, @Body() dto: any) {
    const payload = { id, data: dto };
  
    this.kafkaClient.emit('quota.event.update', JSON.stringify(payload));
    await this.cacheManager.del(`quota:${id}`);
  
    return {
      status: 'Accepted',
      message: 'Yêu cầu cập nhật hạn mức đang được xử lý ngầm!',
    };
  }

  @Delete(':id')
  async deleteQuota(@Param('id') id: string) {
    this.kafkaClient.emit('quota.event.delete', id);
    await this.cacheManager.del(`quota:${id}`);

    return {
      status: 'Accepted',
      message: 'Yêu cầu xóa hạn mức đã được tiếp nhận!',
    };
  }
}
