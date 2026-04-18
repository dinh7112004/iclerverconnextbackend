import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

  constructor(private readonly notificationsService: NotificationsService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    const userId = client.handshake.query.userId as string;
    if (userId) {
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(client.id);
      client.join(`user:${userId}`);
      this.logger.log(`User ${userId} connected with socket ${client.id}`);

      // Send unread count on connection
      this.sendUnreadCount(userId);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    for (const [userId, socketIds] of this.userSockets.entries()) {
      if (socketIds.has(client.id)) {
        socketIds.delete(client.id);
        if (socketIds.size === 0) {
          this.userSockets.delete(userId);
        }
        this.logger.log(`User ${userId} socket ${client.id} disconnected`);
        break;
      }
    }
  }

  @SubscribeMessage('get_notifications')
  async handleGetNotifications(
    @MessageBody()
    data: {
      userId: string;
      limit?: number;
      skip?: number;
      status?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const result = await this.notificationsService.findByUser(data.userId, {
        limit: data.limit,
        skip: data.skip,
        status: data.status as any,
      });

      client.emit('notifications_list', result);
      return result;
    } catch (error) {
      this.logger.error(
        `Error getting notifications: ${error.message}`,
        error.stack,
      );
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(
    @MessageBody() data: { notificationId: string; userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const notification = await this.notificationsService.markAsRead(
        data.notificationId,
        data.userId,
      );

      if (notification) {
        client.emit('notification_updated', notification);
        this.sendUnreadCount(data.userId);
      }

      return notification;
    } catch (error) {
      this.logger.error(
        `Error marking notification as read: ${error.message}`,
        error.stack,
      );
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('mark_all_as_read')
  async handleMarkAllAsRead(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const count = await this.notificationsService.markAllAsRead(data.userId);
      client.emit('all_marked_read', { count });
      this.sendUnreadCount(data.userId);
      return { count };
    } catch (error) {
      this.logger.error(
        `Error marking all as read: ${error.message}`,
        error.stack,
      );
      client.emit('error', { message: error.message });
    }
  }

  @SubscribeMessage('get_unread_count')
  async handleGetUnreadCount(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const count = await this.notificationsService.getUnreadCount(data.userId);
      client.emit('unread_count', { count });
      return { count };
    } catch (error) {
      this.logger.error(
        `Error getting unread count: ${error.message}`,
        error.stack,
      );
      client.emit('error', { message: error.message });
    }
  }

  // Public method to send notification to specific user
  async sendNotificationToUser(userId: string, notification: any) {
    const socketIds = this.userSockets.get(userId);
    if (socketIds && socketIds.size > 0) {
      this.server.to(`user:${userId}`).emit('new_notification', notification);
      this.sendUnreadCount(userId);
      this.logger.log(`Sent notification to user ${userId}`);
    } else {
      this.logger.debug(`User ${userId} not connected via WebSocket`);
    }
  }

  // Public method to broadcast to all users
  broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
    this.logger.log(`Broadcasted ${event} to all clients`);
  }

  // Private helper to send unread count
  private async sendUnreadCount(userId: string) {
    try {
      const count = await this.notificationsService.getUnreadCount(userId);
      this.server.to(`user:${userId}`).emit('unread_count', { count });
    } catch (error) {
      this.logger.error(
        `Error sending unread count: ${error.message}`,
        error.stack,
      );
    }
  }
}
