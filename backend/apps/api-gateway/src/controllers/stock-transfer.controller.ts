import { Controller, Post, Get, Param, Body, Query, Inject, Logger, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('api/stock-transfers')
@UseGuards(JwtAuthGuard)
export class StockTransferController implements OnModuleInit {
  private readonly logger = new Logger(StockTransferController.name);

  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
  ) {}

  private logTransfer(event: string, payload: Record<string, unknown>) {
    console.log(
      `[STOCK_TRANSFER] ${JSON.stringify({
        source: StockTransferController.name,
        event,
        ...payload,
      })}`,
    );
  }

  private logTransferError(event: string, payload: Record<string, unknown>, error: any) {
    this.logger.error(
      `[STOCK_TRANSFER] ${JSON.stringify({
        source: StockTransferController.name,
        event,
        ...payload,
        error: error?.message || String(error),
      })}`,
      error?.stack,
    );
  }


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
    const traceId = randomUUID();
    const totalQuantity = (data.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const context = {
      traceId,
      route: 'POST /api/stock-transfers/direct',
      fromBranchId: data.fromBranchId,
      toBranchId: data.toBranchId,
      itemCount: data.items?.length || 0,
      totalQuantity,
      shippedBy: data.shippedBy,
    };

    this.logTransfer('DIRECT_REQUEST', context);

    try {
      const result = await sendKafkaMessage(this.inventoryClient, 'inventory.transfer.create_direct', {
        ...data,
        traceId,
      });
      this.logTransfer('DIRECT_RESPONSE', {
        ...context,
        success: result?.success,
        transferId: result?.data?._id,
        transferCode: result?.data?.transferCode,
        status: result?.data?.status,
      });
      return result;
    } catch (error) {
      this.logTransferError('DIRECT_ERROR', context, error);
      throw error;
    }
  }

  @Post(':id/receive')
  async confirmStockTransferReceipt(
    @Param('id') id: string,
    @Body() body: { receivedBy: string },
  ) {
    const traceId = randomUUID();
    const context = {
      traceId,
      route: 'POST /api/stock-transfers/:id/receive',
      transferId: id,
      receivedBy: body.receivedBy,
    };

    this.logTransfer('RECEIVE_REQUEST', context);

    try {
      const result = await sendKafkaMessage(this.inventoryClient, 'inventory.transfer.receive', {
        transferId: id,
        receivedBy: body.receivedBy,
        traceId,
      });
      this.logTransfer('RECEIVE_RESPONSE', {
        ...context,
        success: result?.success,
        transferCode: result?.data?.transferCode,
        status: result?.data?.status,
      });
      return result;
    } catch (error) {
      this.logTransferError('RECEIVE_ERROR', context, error);
      throw error;
    }
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
