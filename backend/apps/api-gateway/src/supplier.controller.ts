import { Controller, Get, Post, Body, Inject, OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('api/suppliers')
export class SupplierController implements OnModuleInit {
  constructor(
    @Inject('SUPPLIER_SERVICE') private readonly supplierClient: ClientKafka,
  ) {}

  async onModuleInit() {
    this.supplierClient.subscribeToResponseOf('supplier.get_all');
    this.supplierClient.subscribeToResponseOf('supplier.create');
    await this.supplierClient.connect();
  }

  @Get()
  async getAllSuppliers() {
    return await firstValueFrom(this.supplierClient.send('supplier.get_all', {}));
  }

  @Post()
  async createSupplier(@Body() data: any) {
    return await firstValueFrom(this.supplierClient.send('supplier.create', data));
  }
}
