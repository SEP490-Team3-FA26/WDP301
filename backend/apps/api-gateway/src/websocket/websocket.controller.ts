import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AppWebsocketGateway } from './websocket.gateway';

@Controller()
export class WebsocketController {
  private readonly logger = new Logger(WebsocketController.name);

  constructor(private readonly websocketGateway: AppWebsocketGateway) {}

  @EventPattern('broadcast.inventory_updated')
  handleInventoryUpdated(@Payload() data: any) {
    this.logger.log('Forwarding broadcast.inventory_updated to Socket.IO clients');
    this.websocketGateway.server.emit('inventory_updated', data);
  }

  @EventPattern('broadcast.dashboard_updated')
  handleDashboardUpdated(@Payload() data: any) {
    this.logger.log('Forwarding broadcast.dashboard_updated to Socket.IO clients');
    this.websocketGateway.server.emit('dashboard_updated', data);
  }
}
