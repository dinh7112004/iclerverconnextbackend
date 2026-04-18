import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationStatus, NotificationType } from './entities/notification.entity';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thông báo của người dùng' })
  @ApiQuery({ name: 'status', required: false, enum: NotificationStatus })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  async getNotifications(
    @Request() req: any,
    @Query('status') status?: NotificationStatus,
    @Query('type') type?: NotificationType,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const userId = req.user?.id || 'anonymous';
    return this.notificationsService.findByUser(userId, {
      status,
      type,
      limit: limit ? parseInt(limit) : undefined,
      skip: skip ? parseInt(skip) : undefined,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Lấy số lượng thông báo chưa đọc' })
  async getUnreadCount(@Request() req: any) {
    const userId = req.user?.id || 'anonymous';
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Lấy thống kê thông báo' })
  async getStatistics(@Request() req: any) {
    const userId = req.user?.id || 'anonymous';
    return this.notificationsService.getStatistics(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một thông báo' })
  async getNotification(@Param('id') id: string) {
    return this.notificationsService.findById(id);
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đánh dấu thông báo là đã đọc' })
  async markAsRead(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || 'anonymous';
    const notification = await this.notificationsService.markAsRead(id, userId);

    // Send real-time update
    if (notification) {
      this.notificationsGateway.sendNotificationToUser(userId, notification);
    }

    return notification;
  }

  @Put('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo là đã đọc' })
  async markAllAsRead(@Request() req: any) {
    const userId = req.user?.id || 'anonymous';
    const count = await this.notificationsService.markAllAsRead(userId);
    return { count };
  }

  @Put(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lưu trữ thông báo' })
  async archiveNotification(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || 'anonymous';
    return this.notificationsService.archive(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa thông báo' })
  async deleteNotification(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || 'anonymous';
    const deleted = await this.notificationsService.delete(id, userId);
    return { success: deleted };
  }

  // Admin endpoints
  @Post('test')
  @ApiOperation({ summary: '[Admin] Tạo thông báo test' })
  async createTestNotification(
    @Body()
    data: {
      userId: string;
      title: string;
      message: string;
      type?: NotificationType;
    },
  ) {
    const notification = await this.notificationsService.create({
      userId: data.userId,
      type: data.type || NotificationType.SYSTEM_ALERT,
      title: data.title,
      message: data.message,
      sendPush: true,
    });

    // Send real-time notification
    this.notificationsGateway.sendNotificationToUser(
      data.userId,
      notification,
    );

    return notification;
  }

  @Post('broadcast')
  @ApiOperation({ summary: '[Admin] Gửi thông báo đến nhiều người dùng' })
  async broadcastNotification(
    @Body()
    data: {
      userIds: string[];
      title: string;
      message: string;
      type?: NotificationType;
    },
  ) {
    const notifications = await this.notificationsService.createBulk(
      data.userIds.map((userId) => ({
        userId,
        type: data.type || NotificationType.ANNOUNCEMENT,
        title: data.title,
        message: data.message,
        sendPush: true,
      })),
    );

    // Send real-time notifications
    notifications.forEach((notification) => {
      this.notificationsGateway.sendNotificationToUser(
        notification.userId,
        notification,
      );
    });

    return { sent: notifications.length };
  }
}
