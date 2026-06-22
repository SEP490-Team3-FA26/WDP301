import { Controller, Get, Post, Put, Body, Param, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';

@Controller()
export class SupplierCreditController implements OnModuleInit {
  constructor(
    @Inject('SUPPLIER_SERVICE') private readonly supplierClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.supplierClient, [
      'supplier.credit.check_limit',
      'supplier.credit.update_limit',
      'supplier.credit.record_grn',
      'supplier.credit.record_payment',
      'supplier.credit.debt_detail',
      'supplier.credit.debt_summary',
      'supplier.credit.debt_overdue',
      'supplier.credit.debt_aging',
    ]);
  }

  @Get('api/supplier-credit/summary')
  async getDebtSummary() {
    return await sendKafkaMessage(this.supplierClient, 'supplier.credit.debt_summary', {});
  }

  @Get('api/supplier-credit/overdue')
  async getOverdueDebts() {
    return await sendKafkaMessage(this.supplierClient, 'supplier.credit.debt_overdue', {});
  }

  @Post('api/supplier-credit/check-limit')
  async checkCreditLimit(@Body() data: { supplierId: string; amount: number }) {
    return await sendKafkaMessage(this.supplierClient, 'supplier.credit.check_limit', data);
  }

  @Get('api/suppliers/:id/credit')
  async getSupplierDebtDetail(@Param('id') id: string) {
    return await sendKafkaMessage(this.supplierClient, 'supplier.credit.debt_detail', { supplierId: id });
  }

  @Put('api/suppliers/:id/credit-limit')
  async updateCreditLimit(
    @Param('id') id: string,
    @Body() data: { creditLimit?: number; paymentTermDays?: number },
  ) {
    return await sendKafkaMessage(this.supplierClient, 'supplier.credit.update_limit', {
      supplierId: id,
      ...data,
    });
  }

  @Post('api/suppliers/:id/payment')
  async recordPayment(
    @Param('id') id: string,
    @Body() data: { amount: number; paymentMethod: string; notes?: string; performedBy?: string },
  ) {
    return await sendKafkaMessage(this.supplierClient, 'supplier.credit.record_payment', {
      supplierId: id,
      ...data,
    });
  }

  @Get('api/suppliers/:id/aging')
  async getSupplierAging(@Param('id') id: string) {
    return await sendKafkaMessage(this.supplierClient, 'supplier.credit.debt_aging', { supplierId: id });
  }
}
