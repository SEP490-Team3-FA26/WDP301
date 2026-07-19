import { Controller, Get, Post, Put, Delete, Body, Param, Inject, OnModuleInit, HttpStatus, HttpCode, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('💰 Quota Allocation')
@Controller('api/quotas')
@UseGuards(JwtAuthGuard)
export class QuotaController implements OnModuleInit {
  private readonly CACHE_TTL = 3600000;

  constructor(
    @Inject('KAFKA_SERVICE') private readonly kafkaClient: ClientKafka,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) { }

  async onModuleInit() {
    await subscribeToKafkaTopics(this.kafkaClient, [
      'quota.get.by.id',
      'quota.get.by.branch',
      'quota.get.summary',
      'quota.get.all',
    ]);
  }

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Tạo hạn mức nhập hàng mới' })
  async createQuota(@Body() dto: { branchId: string; branchName?: string; cycle: string; totalBudget: number; usedAmount?: number; status?: string; note?: string }) {
    if (dto.totalBudget === undefined || dto.totalBudget === null) {
      throw new BadRequestException('Tổng hạn mức ngân sách không được để trống.');
    }
    if (typeof dto.totalBudget !== 'number' || isNaN(dto.totalBudget) || dto.totalBudget <= 0) {
      throw new BadRequestException('Tổng hạn mức ngân sách phải là số dương lớn hơn 0.');
    }

    this.kafkaClient.emit('quota.event.create', JSON.stringify(dto)).subscribe();

    return {
      status: 'Accepted',
      message: 'Sự kiện tạo hạn mức đã được gửi vào hàng đợi Kafka để xử lý!',
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Lấy tổng quan hạn mức của toàn chuỗi theo chu kỳ' })
  async getQuotaSummary(@Query() query: any) {
    return await sendKafkaMessage(this.kafkaClient, 'quota.get.summary', JSON.stringify(query));
  }

  @Get('branch/:branchId')
  @ApiOperation({ summary: 'Lấy danh sách hạn mức theo mã chi nhánh' })
  async getQuotaByBranch(@Param('branchId') branchId: string) {
    return await sendKafkaMessage(this.kafkaClient, 'quota.get.by.branch', branchId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một hạn mức' })
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
  @ApiOperation({ summary: 'Lấy danh sách hạn mức phân bổ' })
  async getAllQuotas(@Query() query: any) {
    return await sendKafkaMessage(this.kafkaClient, 'quota.get.all', JSON.stringify(query));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin hạn mức' })
  async updateQuota(@Param('id') id: string, @Body() dto: any) {
    if (dto.totalBudget === undefined || dto.totalBudget === null) {
      throw new BadRequestException('Tổng hạn mức ngân sách không được để trống.');
    }
    if (typeof dto.totalBudget !== 'number' || isNaN(dto.totalBudget) || dto.totalBudget <= 0) {
      throw new BadRequestException('Tổng hạn mức ngân sách phải là số dương lớn hơn 0.');
    }

    // Kiểm tra không cho phép nhỏ hơn số tiền đã sử dụng (usedAmount)
    const existingQuota = await sendKafkaMessage(this.kafkaClient, 'quota.get.by.id', id);
    if (existingQuota) {
      const usedAmount = existingQuota.usedAmount || 0;
      if (dto.totalBudget < usedAmount) {
        throw new BadRequestException(`Tổng hạn mức mới không thể nhỏ hơn số tiền đã sử dụng (${usedAmount.toLocaleString()}đ).`);
      }
    }

    const payload = { id, data: dto };

    this.kafkaClient.emit('quota.event.update', JSON.stringify(payload)).subscribe();
    await this.cacheManager.del(`quota:${id}`);

    return {
      status: 'Accepted',
      message: 'Yêu cầu cập nhật hạn mức đang được xử lý ngầm!',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa hạn mức' })
  async deleteQuota(@Param('id') id: string) {
    this.kafkaClient.emit('quota.event.delete', id).subscribe();
    await this.cacheManager.del(`quota:${id}`);

    return {
      status: 'Accepted',
      message: 'Yêu cầu xóa hạn mức đã được tiếp nhận!',
    };
  }
}
