import { Controller, Post, Patch, Get, Param, Body, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuditLogAction } from '../decorators/audit-log.decorator';
import { AppWebsocketGateway } from '../websocket/websocket.gateway';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { NotificationService } from '../notification/notification.service';

@Controller('api/goods-receipts')
@UseGuards(JwtAuthGuard)
export class GoodsReceiptController implements OnModuleInit {
  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    private readonly websocketGateway: AppWebsocketGateway,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly notificationService: NotificationService,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'inventory.grn.create',
      'inventory.grn.list',
      'inventory.grn.get_by_id',
      'inventory.grn.submit_inspection',
      'inventory.grn.approve',
      'inventory.grn.reject',
      'inventory.grn.update',
    ]);
  }

  @Post()
  @AuditLogAction({
    actionCode: 'GRN_CREATE',
    actionName: 'Tạo phiếu nhập kho',
    module: 'Inventory',
    eventType: 'CREATE',
    entityType: 'GoodsReceiptNote',
  })
  async createGoodsReceiptNote(@Body() data: any) {
    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.grn.create', data);
    
    // Handle nested response
    const grnData = result.data || result;
    
    // Emit notification to admin and warehouse
    if (this.websocketGateway.server && grnData) {
      const notificationPayload = {
        type: 'GRN_COMPLETED',
        grnId: grnData._id || grnData.id,
        poId: grnData.poId,
        itemsCount: grnData.items?.length || 0,
        totalAmount: grnData.totalAmount || 0,
        receivedBy: data.receivedBy || grnData.receivedBy || 'Kho',
        message: `Đã nhập kho thành công ${grnData.items?.length || 0} loại thuốc`,
        timestamp: new Date().toISOString(),
      };
      
      console.log('📥 Emitting GRN completed notification:', notificationPayload);
      this.websocketGateway.server.to('admin').emit('grn_completed_notification', notificationPayload);
      this.websocketGateway.server.to('warehouse').emit('grn_completed_notification', notificationPayload);
      
      // Persist to DB - target rooms: admin + warehouse + branch (if applicable)
      const targetRooms = ['admin', 'warehouse'];
      
      // Also notify the branch that requested (if linked to PR)
      if (grnData.linkedPrId || data.branchId) {
        const branchId = data.branchId || grnData.branchId;
        if (branchId) {
          const branchNotification = {
            ...notificationPayload,
            message: `Hàng đã nhập kho: ${grnData.items?.length || 0} loại thuốc`,
          };
          this.websocketGateway.server.to(`branch-${branchId}`).emit('grn_completed_notification', branchNotification);
          targetRooms.push(`branch-${branchId}`);
        }
      }
      
      this.notificationService.create({
        type: 'GRN_COMPLETED',
        targetRooms,
        message: notificationPayload.message,
        grnId: notificationPayload.grnId,
        poId: notificationPayload.poId,
        itemsCount: notificationPayload.itemsCount,
        totalAmount: notificationPayload.totalAmount,
        receivedBy: notificationPayload.receivedBy,
      }).catch(err => console.error('Failed to persist GRN_COMPLETED notification:', err));
    }
    
    // Evict seasonal analysis cache on inventory updates
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const branch = data.branchId || (grnData && grnData.branchId) || 'all';
      await this.cacheManager.del(`reports:seasonal-analysis:${branch}:${currentMonth}`);
      await this.cacheManager.del(`reports:seasonal-analysis:all:${currentMonth}`);
      console.log(`🗑️ [Cache Evict] Evicted seasonal analysis cache on GRN create for branch ${branch}`);
    } catch (err) {
      console.error('Lỗi xóa cache trong GoodsReceiptController:', err);
    }
    
    return result;
  }

  @Patch(':id')
  @AuditLogAction({
    actionCode: 'GRN_UPDATE',
    actionName: 'Cập nhật phiếu nhập kho',
    module: 'Inventory',
    eventType: 'UPDATE',
    entityType: 'GoodsReceiptNote',
  })
  async updateGoodsReceiptNote(@Param('id') id: string, @Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.grn.update', { id, ...data });
  }

  @Get()
  async listGoodsReceiptNotes() {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.grn.list', {});
  }

  @Get(':id')
  async getGoodsReceiptNoteById(@Param('id') id: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.grn.get_by_id', { id });
  }

  @Post(':id/submit-inspection')
  @AuditLogAction({
    actionCode: 'GRN_SUBMIT_INSPECTION',
    actionName: 'Nộp biên bản kiểm tra nhập kho',
    module: 'Inventory',
    eventType: 'APPROVE',
    entityType: 'GoodsReceiptNote',
  })
  async submitGoodsReceiptInspection(@Param('id') id: string) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.grn.submit_inspection', { id });
  }

  @Post(':id/approve')
  @AuditLogAction({
    actionCode: 'GRN_APPROVE',
    actionName: 'Phê duyệt phiếu nhập kho',
    module: 'Inventory',
    eventType: 'APPROVE',
    entityType: 'GoodsReceiptNote',
  })
  async approveGoodsReceiptNote(@Param('id') id: string, @Body() data: { discrepancyReason?: string }) {
    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.grn.approve', { id, discrepancyReason: data.discrepancyReason });
    
    // Evict cache on approval
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      // Evict all since GRN approval impacts multi-branch/HQ status or specific branch
      const grnData = result?.data || result;
      const branch = (grnData && grnData.branchId) || 'all';
      await this.cacheManager.del(`reports:seasonal-analysis:${branch}:${currentMonth}`);
      await this.cacheManager.del(`reports:seasonal-analysis:all:${currentMonth}`);
      console.log(`🗑️ [Cache Evict] Evicted seasonal analysis cache on GRN approval for branch ${branch}`);
    } catch (err) {
      console.error('Lỗi xóa cache trong GoodsReceiptController:', err);
    }
    
    return result;
  }

  @Post(':id/reject')
  @AuditLogAction({
    actionCode: 'GRN_REJECT',
    actionName: 'Từ chối phiếu nhập kho',
    module: 'Inventory',
    eventType: 'REJECT',
    entityType: 'GoodsReceiptNote',
  })
  async rejectGoodsReceiptNote(@Param('id') id: string, @Body() data: { action: string; reason: string }) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.grn.reject', { id, action: data.action, reason: data.reason });
  }

  @Get(':id/items/:itemId/inspection')
  async getInspectionRecord(@Param('id') id: string, @Param('itemId') itemId: string) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`http://ai-service:8000/api/ai/receipts/${id}/items/${itemId}/inspection`, {
        headers: {
          'X-Internal-Token': process.env.JWT_SECRET || 'wdp301-super-secret-key-change-in-production',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
      return { success: false, message: 'Inspection record not found or error occurred.' };
    } catch (e) {
      return { success: false, message: 'Failed to fetch inspection record.' };
    }
  }


  // Inspection Endpoints
  @Post('inspections')
  async createInspectionRecord(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.inspection.create', data);
  }

  @Post('inspections/verify')
  async verifyInspectionItem(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.inspection.verify_item', data);
  }

  @Post('inspections/submit')
  async submitInspectionReport(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.inspection.submit', data);
  }

  @Post('approve')
  async approveGoodsReceipt(@Body() data: any) {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.grn.approve', data);
  }

  @Get('inspections/all')
  async listInspectionRecords() {
    return await sendKafkaMessage(this.inventoryClient, 'inventory.inspection.list', {});
  }
}
