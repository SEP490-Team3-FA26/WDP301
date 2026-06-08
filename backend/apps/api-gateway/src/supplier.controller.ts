import { Controller, Get, Post, Body, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from './common/kafka.helper';
@Controller('api/suppliers')
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
  async createSupplier(@Body() data: any) {
    return await sendKafkaMessage(this.supplierClient, 'supplier.create', data);
  }
}
