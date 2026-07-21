import { Controller, Post, Get, Put, Delete, Body, Param, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogAction } from '../decorators/audit-log.decorator';

@ApiTags('🎟️ Vouchers')
@Controller('api/vouchers')
@ApiBearerAuth()
export class VoucherController implements OnModuleInit {
  constructor(
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.orderClient, [
      'vouchers.create',
      'vouchers.update',
      'vouchers.delete',
      'vouchers.list',
      'vouchers.validate',
    ]);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @AuditLogAction({
    actionCode: 'VOUCHER_CREATE',
    actionName: 'Tạo Voucher khuyến mãi',
    module: 'Voucher',
    eventType: 'CREATE',
    entityType: 'Voucher',
  })
  async createVoucher(@Body() data: any) {
    return await sendKafkaMessage(this.orderClient, 'vouchers.create', data);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async listVouchers() {
    return await sendKafkaMessage(this.orderClient, 'vouchers.list', {});
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @AuditLogAction({
    actionCode: 'VOUCHER_UPDATE',
    actionName: 'Cập nhật Voucher khuyến mãi',
    module: 'Voucher',
    eventType: 'UPDATE',
    entityType: 'Voucher',
  })
  async updateVoucher(@Param('id') id: string, @Body() payload: any) {
    return await sendKafkaMessage(this.orderClient, 'vouchers.update', { id, payload });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @AuditLogAction({
    actionCode: 'VOUCHER_DELETE',
    actionName: 'Xóa Voucher khuyến mãi',
    module: 'Voucher',
    eventType: 'DELETE',
    entityType: 'Voucher',
  })
  async deleteVoucher(@Param('id') id: string) {
    return await sendKafkaMessage(this.orderClient, 'vouchers.delete', { id });
  }

  @Post('validate')
  @UseGuards(OptionalJwtAuthGuard)
  async validateVoucher(@Body() data: { code: string; subtotal: number }) {
    return await sendKafkaMessage(this.orderClient, 'vouchers.validate', data);
  }
}
