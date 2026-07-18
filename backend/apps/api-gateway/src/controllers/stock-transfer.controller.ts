import { Controller, Post, Get, Param, Body, Query, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('api/stock-transfers')
@UseGuards(JwtAuthGuard)
export class StockTransferController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
  ) {}


  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.transfer.create',
      'inventory.transfer.create_direct',
      'inventory.transfer.recommend',
      'inventory.transfer.receive',
      'inventory.transfer.list',
      'inventory.transfer.get_by_id',
    ]);
  }

  @Get('recommend')
  async recommendStockTransfer(
    @Query('medicineId') medicineId: string,
    @Query('toBranchId') toBranchId: string,
    @Query('quantity') quantity: number,
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.transfer.recommend', {
      medicineId,
      toBranchId,
      quantity: Number(quantity),
    });
  }

  @Post()
  async createStockTransfer(@Body() data: { prId: string; shippedBy: string; fromBranchId?: string }) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.transfer.create', data);
  }

  @Post('direct')
  async createDirectStockTransfer(
    @Body() data: {
      fromBranchId: string;
      toBranchId: string;
      toBranchName: string;
      shippedBy: string;
      items: { medicineId: string; medicineName: string; quantity: number; unit?: string }[];
    }
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.transfer.create_direct', data);
  }

  @Post(':id/receive')
  async confirmStockTransferReceipt(
    @Param('id') id: string,
    @Body() body: { receivedBy: string },
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.transfer.receive', {
      transferId: id,
      receivedBy: body.receivedBy,
    });
  }

  @Get()
  async listStockTransfers(
    @Query('status') status?: string,
    @Query('toBranchId') toBranchId?: string,
  ) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.transfer.list', {
      status,
      toBranchId,
    });
  }

  @Get(':id')
  async getStockTransferById(@Param('id') id: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.transfer.get_by_id', { id });
  }
}
