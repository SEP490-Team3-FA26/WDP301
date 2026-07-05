import { Module } from '@nestjs/common';
import { AppWebsocketGateway } from './websocket.gateway';
import { WebsocketController } from './websocket.controller';

@Module({
  providers: [AppWebsocketGateway],
  controllers: [WebsocketController],
  exports: [AppWebsocketGateway],
})
export class WebsocketModule {}
