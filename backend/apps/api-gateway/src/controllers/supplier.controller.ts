import { Controller, Get, Post, Body, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuditLogAction } from '../decorators/audit-log.decorator';

@Controller('api/suppliers')
@UseGuards(JwtAuthGuard)
export class SupplierController implements OnModuleInit {
  constructor(
    @Inject('SUPPLIER_SERVICE') private readonly supplierClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.supplierClient, [
      'supplier.get_all',
      'supplier.create',
    ]);
  }

  @Get()
  async getAllSuppliers() {
    return await sendKafkaMessage(this.supplierClient, 'supplier.get_all', {});
  }

  @Post()
  @AuditLogAction({
    actionCode: 'SUPPLIER_CREATE',
    actionName: 'Tạo nhà cung cấp',
    module: 'Supplier',
    eventType: 'CREATE',
    entityType: 'Supplier',
  })
  async createSupplier(@Body() data: any) {
    return await sendKafkaMessage(this.supplierClient, 'supplier.create', data);
  }
}
