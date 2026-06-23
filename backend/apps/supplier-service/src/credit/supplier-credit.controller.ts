import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SupplierCreditService } from './supplier-credit.service';

@Controller()
export class SupplierCreditController {
  private readonly logger = new Logger(SupplierCreditController.name);

  constructor(private readonly creditService: SupplierCreditService) {}

  @MessagePattern('supplier.credit.check_limit')
  async checkCreditLimit(@Payload() data: { supplierId: string; amount: number }) {
    this.logger.log(`[Kafka] supplier.credit.check_limit — ${data.supplierId}`);
    return this.creditService.checkCreditLimit(data.supplierId, data.amount);
  }

  @MessagePattern('supplier.credit.update_limit')
  async updateCreditLimit(@Payload() data: { supplierId: string; creditLimit?: number; paymentTermDays?: number }) {
    this.logger.log(`[Kafka] supplier.credit.update_limit — ${data.supplierId}`);
    return this.creditService.updateCreditLimit(data.supplierId, data);
  }

  @MessagePattern('supplier.credit.record_grn')
  async recordGrnPayable(@Payload() data: { supplierId: string; grnId: string; amount: number; performedBy?: string }) {
    this.logger.log(`[Kafka] supplier.credit.record_grn — ${data.supplierId}, amount: ${data.amount}`);
    return this.creditService.recordGrnPayable(data);
  }

  @MessagePattern('supplier.credit.record_payment')
  async recordPayment(@Payload() data: { supplierId: string; amount: number; paymentMethod: string; notes?: string; performedBy?: string }) {
    this.logger.log(`[Kafka] supplier.credit.record_payment — ${data.supplierId}`);
    return this.creditService.recordPayment(data);
  }

  @MessagePattern('supplier.credit.debt_detail')
  async getDebtDetail(@Payload() data: { supplierId: string }) {
    this.logger.log(`[Kafka] supplier.credit.debt_detail — ${data.supplierId}`);
    return this.creditService.getDebtDetail(data.supplierId);
  }

  @MessagePattern('supplier.credit.debt_summary')
  async getDebtSummary() {
    this.logger.log('[Kafka] supplier.credit.debt_summary');
    return this.creditService.getDebtSummary();
  }

  @MessagePattern('supplier.credit.debt_overdue')
  async getOverdueDebts() {
    this.logger.log('[Kafka] supplier.credit.debt_overdue');
    return this.creditService.getOverdueDebts();
  }

  @MessagePattern('supplier.credit.debt_aging')
  async getDebtAging(@Payload() data: { supplierId: string }) {
    this.logger.log(`[Kafka] supplier.credit.debt_aging — ${data.supplierId}`);
    return this.creditService.getDebtAging(data.supplierId);
  }
}
