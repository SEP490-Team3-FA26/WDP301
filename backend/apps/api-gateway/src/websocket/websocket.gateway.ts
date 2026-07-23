import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EventPattern, Payload } from '@nestjs/microservices';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AppWebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('AppWebsocketGateway');

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('🚀 WebSocket Gateway Initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    try {
      // Extract token from handshake auth or query
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      
      if (token) {
        // Verify JWT token
        const decoded = this.jwtService.verify(token as string);
        const { role, branchId, email, fullName } = decoded;
        const userId = decoded.sub || decoded._id;
        
        // Store user data in socket
        client.data.user = { userId, role, branchId, email, fullName };
        
        this.logger.log(`🔌 User connecting: ${email} with role: ${role}`);
        
        // Join rooms based on role
        if (role === 'admin' || role === 'head_branch') {
          client.join('admin');
          this.logger.log(`👤 Admin connected: ${email} (${client.id}) → joined room 'admin'`);
        }
        
        if (role === 'warehouse') {
          client.join('warehouse');
          this.logger.log(`📦 Warehouse connected: ${email} (${client.id}) → joined room 'warehouse'`);
        }
        
        if (role === 'branch' && branchId) {
          client.join(`branch-${branchId}`);
          this.logger.log(`🏪 Branch connected: ${email} from ${branchId} (${client.id}) → joined room 'branch-${branchId}'`);
        }
        
        if (role === 'pharmacist' && branchId) {
          client.join(`branch-${branchId}`);
          this.logger.log(`💊 Pharmacist connected: ${email} from ${branchId} (${client.id}) → joined room 'branch-${branchId}'`);
        }
        
        // Join personal room for targeted messages
        if (userId) {
          client.join(`user-${userId}`);
        }
        
        // Log all rooms this client joined
        const rooms = Array.from(client.rooms);
        this.logger.log(`✅ Client ${email} joined ${rooms.length} rooms: ${rooms.join(', ')}`);
        
      } else {
        this.logger.warn(`⚠️  Client connected without token: ${client.id}`);
      }
    } catch (error) {
      this.logger.error(`❌ Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (user) {
      this.logger.log(`👋 Client disconnected: ${user.email} (${client.id})`);
    } else {
      this.logger.log(`👋 Client disconnected: ${client.id}`);
    }
  }

}
