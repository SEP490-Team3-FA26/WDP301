import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppWebsocketGateway } from './websocket.gateway';
import { WebsocketController } from './websocket.controller';

@Module({
  imports: [
    // Import JwtModule để AppWebsocketGateway có thể inject JwtService
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '3600s') },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AppWebsocketGateway],
  controllers: [WebsocketController],
  exports: [AppWebsocketGateway],
})
export class WebsocketModule {}
