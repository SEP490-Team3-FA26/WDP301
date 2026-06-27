import { Controller, Post, Get, Put, Delete, Body, Param, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('🎟️ Vouchers')
@Controller('api/vouchers')
@UseGuards(JwtAuthGuard)
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
  async createVoucher(@Body() data: any) {
    return await sendKafkaMessage(this.orderClient, 'vouchers.create', data);
  }

  @Get()
  async listVouchers() {
    return await sendKafkaMessage(this.orderClient, 'vouchers.list', {});
  }

  @Put(':id')
  async updateVoucher(@Param('id') id: string, @Body() payload: any) {
    return await sendKafkaMessage(this.orderClient, 'vouchers.update', { id, payload });
  }

  @Delete(':id')
  async deleteVoucher(@Param('id') id: string) {
    return await sendKafkaMessage(this.orderClient, 'vouchers.delete', { id });
  }

  @Post('validate')
  async validateVoucher(@Body() data: { code: string; subtotal: number }) {
    return await sendKafkaMessage(this.orderClient, 'vouchers.validate', data);
  }
}
