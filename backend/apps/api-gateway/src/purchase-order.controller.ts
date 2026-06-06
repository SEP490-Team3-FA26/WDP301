import { Controller, Post, Body, Inject, OnModuleInit, HttpException, HttpStatus } from '@nestjs/common';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('api/purchase-orders')
export class PurchaseOrderController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
  ) {}

  async onModuleInit() {
    this.inventoryClient.subscribeToResponseOf('inventory.po.create');
    await this.inventoryClient.connect();
  }

  @Post()
  async createPurchaseOrder(@Body() data: any) {
    try {
      return await firstValueFrom(this.inventoryClient.send('inventory.po.create', data));
    } catch (e) {
      throw new HttpException(e.message || 'Lỗi hệ thống', HttpStatus.BAD_REQUEST);
    }
  }
}
