import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * WebSocket Gateway for Real-Time Order Updates
 * 
 * Events:
 * - order:created - New order placed (→ Waiter)
 * - order:accepted - Order accepted by waiter (→ Customer, Kitchen)
 * - order:rejected - Order rejected by waiter (→ Customer)
 * - order:status - Order status changed (→ Customer, Waiter, Kitchen)
 * - order:preparing - Kitchen started preparing (→ Customer, Waiter)
 * - order:ready - Order ready for pickup (→ Waiter, Customer)
 * - order:served - Order served to customer (→ Customer)
 * - order:completed - Payment completed (→ all)
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class OrdersGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OrdersGateway.name);

  constructor(private jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from handshake
      const token = client.handshake.auth?.token || 
                   client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });

      // Attach user data to socket
      client.data.user = {
        userId: payload.userId || payload.sub,
        email: payload.email,
        role: payload.role,
      };

      // Join role-based room
      client.join(`role:${payload.role}`);

      // Join user-specific room
      client.join(`user:${payload.userId || payload.sub}`);

      this.logger.log(
        `Client connected: ${client.id} | User: ${payload.email} | Role: ${payload.role} | Rooms: role:${payload.role}, user:${payload.userId || payload.sub}`,
      );

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to Order WebSocket',
        userId: payload.userId || payload.sub,
        role: payload.role,
      });
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error.message);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (user) {
      this.logger.log(`Client disconnected: ${client.id} | User: ${user.email}`);
    } else {
      this.logger.log(`Client disconnected: ${client.id}`);
    }
  }

  /**
   * Notify waiters of new order
   */
  notifyNewOrder(order: any) {
    this.logger.log(`Notifying waiters of new order #${order.id}`);
    this.server.to('role:waiter').emit('newOrder', order);
    this.server.to('role:kitchen').emit('newOrder', order);
    this.server.to('role:admin').emit('newOrder', order);
    this.server.to('role:super_admin').emit('newOrder', order);
  }

  /**
   * Notify customer of order acceptance
   */
  notifyOrderAccepted(order: any) {
    this.logger.log(`[notifyOrderAccepted] Order #${order.id} - Emitting to role:kitchen, role:admin, user:${order.user_id}`);
    this.server.to(`user:${order.user_id}`).emit('orderAccepted', order);
    
    // Also notify kitchen of new order to prepare
    this.server.to('role:kitchen').emit('orderAccepted', order);
    this.server.to('role:admin').emit('orderAccepted', order);
    
    this.logger.log(`[notifyOrderAccepted] Emitted orderAccepted event for order #${order.id}`);
  }

  /**
   * Notify customer of order rejection
   */
  notifyOrderRejected(order: any) {
    this.logger.log(`Notifying customer of rejected order #${order.id}`);
    this.server.to(`user:${order.user_id}`).emit('orderRejected', order);
  }

  /**
   * Notify relevant parties of status change
   */
  notifyStatusChange(order: any, previousStatus: string) {
    this.logger.log(`Order #${order.id} status changed: ${previousStatus} → ${order.status}`);
    
    // Always notify the customer
    this.server.to(`user:${order.user_id}`).emit('orderStatusChange', order, previousStatus);
    
    // Also notify waiters and kitchen of status changes
    this.server.to('role:waiter').emit('orderStatusChange', order, previousStatus);
    this.server.to('role:kitchen').emit('orderStatusChange', order, previousStatus);
    this.server.to('role:admin').emit('orderStatusChange', order, previousStatus);
  }

  /**
   * Join table-specific room (for future multi-table support)
   */
  @SubscribeMessage('join:table')
  handleJoinTable(client: Socket, tableId: number) {
    client.join(`table:${tableId}`);
    this.logger.log(`Client ${client.id} joined table:${tableId}`);
    return { success: true, tableId };
  }

  /**
   * Leave table-specific room
   */
  @SubscribeMessage('leave:table')
  handleLeaveTable(client: Socket, tableId: number) {
    client.leave(`table:${tableId}`);
    this.logger.log(`Client ${client.id} left table:${tableId}`);
    return { success: true, tableId };
  }

  /**
   * Join order-specific room for updates
   */
  @SubscribeMessage('join:order')
  handleJoinOrder(client: Socket, orderId: number) {
    client.join(`order:${orderId}`);
    this.logger.log(`Client ${client.id} joined order:${orderId}`);
    return { success: true, orderId };
  }

  /**
   * Leave order-specific room
   */
  @SubscribeMessage('leave:order')
  handleLeaveOrder(client: Socket, orderId: number) {
    client.leave(`order:${orderId}`);
    this.logger.log(`Client ${client.id} left order:${orderId}`);
    return { success: true, orderId };
  }

  /**
   * Ping-pong for connection health check
   */
  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    return { event: 'pong', data: { timestamp: new Date().toISOString() } };
  }
}
