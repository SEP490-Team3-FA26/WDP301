import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AppWebsocketGateway } from './websocket.gateway';

@Controller()
export class WebsocketController {
  private readonly logger = new Logger(WebsocketController.name);

  constructor(private readonly websocketGateway: AppWebsocketGateway) {}

  @EventPattern('broadcast.inventory_updated')
  handleInventoryUpdated(@Payload() data: any) {
    this.logger.log('📦 Forwarding broadcast.inventory_updated to Socket.IO clients');
    this.websocketGateway.server.emit('inventory_updated', data);
  }

  @EventPattern('broadcast.dashboard_updated')
  handleDashboardUpdated(@Payload() data: any) {
    this.logger.log('📊 Forwarding broadcast.dashboard_updated to Socket.IO clients');
    this.websocketGateway.server.emit('dashboard_updated', data);
  }

  @EventPattern('notification.new_pr')
  handleNewPRNotification(@Payload() data: any) {
    this.logger.log(`🔔 New PR notification: ${data.prCode} from ${data.branchName}`);
    // Emit to warehouse room only (NOT admin)
    this.websocketGateway.server.to('warehouse').emit('new_pr_notification', {
      type: 'NEW_PR',
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  @EventPattern('notification.pr_approved')
  handlePRApprovedNotification(@Payload() data: any) {
    this.logger.log(`✅ PR approved notification: ${data.prCode}`);
    // Emit to specific branch
    if (data.branchId) {
      this.websocketGateway.server.to(`branch-${data.branchId}`).emit('pr_approved_notification', {
        type: 'PR_APPROVED',
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @EventPattern('notification.pr_rejected')
  handlePRRejectedNotification(@Payload() data: any) {
    this.logger.log(`❌ PR rejected notification: ${data.prCode}`);
    // Emit to specific branch
    if (data.branchId) {
      this.websocketGateway.server.to(`branch-${data.branchId}`).emit('pr_rejected_notification', {
        type: 'PR_REJECTED',
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @EventPattern('notification.new_po')
  handleNewPONotification(@Payload() data: any) {
    this.logger.log(`📦 New PO notification: ${data.supplierId || 'Unknown supplier'}`);
    // Emit to admin room ONLY (NOT warehouse)
    this.websocketGateway.server.to('admin').emit('new_po_notification', {
      type: 'NEW_PO',
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  @EventPattern('notification.grn_completed')
  handleGRNCompletedNotification(@Payload() data: any) {
    this.logger.log(`📥 GRN completed notification: ${data.grnId}`);
    // Emit to admin and warehouse
    this.websocketGateway.server.to('admin').emit('grn_completed_notification', {
      type: 'GRN_COMPLETED',
      ...data,
      timestamp: new Date().toISOString(),
    });
    this.websocketGateway.server.to('warehouse').emit('grn_completed_notification', {
      type: 'GRN_COMPLETED',
      ...data,
      timestamp: new Date().toISOString(),
    });
    
    // Also notify branch if specified
    if (data.branchId) {
      this.websocketGateway.server.to(`branch-${data.branchId}`).emit('grn_completed_notification', {
        type: 'GRN_COMPLETED',
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
