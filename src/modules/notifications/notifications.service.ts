import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from './entities/notification.entity';

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  data?: any;
  sendEmail?: boolean;
  sendSMS?: boolean;
  sendPush?: boolean;
  expiresAt?: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = await this.notificationModel.create({
      ...dto,
      status: NotificationStatus.UNREAD,
    });

    this.logger.log(
      `Created notification ${notification._id} for user ${dto.userId}`,
    );

    // TODO: Send email/SMS/push notifications based on flags
    if (dto.sendEmail) {
      await this.sendEmailNotification(notification);
    }
    if (dto.sendSMS) {
      await this.sendSMSNotification(notification);
    }
    if (dto.sendPush) {
      await this.sendPushNotification(notification);
    }

    return notification;
  }

  async createBulk(dtos: CreateNotificationDto[]): Promise<Notification[]> {
    const notifications = (await this.notificationModel.insertMany(
      dtos.map((dto) => ({
        ...dto,
        status: NotificationStatus.UNREAD,
      })),
    )) as unknown as Notification[];

    this.logger.log(`Created ${notifications.length} notifications in bulk`);

    // Send notifications asynchronously
    notifications.forEach(async (notification: any) => {
      const dto = dtos.find((d) => d.userId === notification.userId);
      if (dto?.sendEmail) await this.sendEmailNotification(notification);
      if (dto?.sendSMS) await this.sendSMSNotification(notification);
      if (dto?.sendPush) await this.sendPushNotification(notification);
    });

    return notifications;
  }

  async findByUser(
    userId: string,
    options: {
      status?: NotificationStatus;
      type?: NotificationType;
      limit?: number;
      skip?: number;
    } = {},
  ): Promise<{ data: Notification[]; total: number }> {
    const query: any = { userId };
    if (options.status) query.status = options.status;
    if (options.type) query.type = options.type;

    const [data, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0)
        .exec(),
      this.notificationModel.countDocuments(query),
    ]);

    return { data, total };
  }

  async findById(id: string): Promise<Notification> {
    return this.notificationModel.findById(id);
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: id, userId },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
      { new: true },
    );

    if (notification) {
      this.logger.log(`Marked notification ${id} as read`);
    }

    return notification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationModel.updateMany(
      { userId, status: NotificationStatus.UNREAD },
      {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    );

    this.logger.log(`Marked ${result.modifiedCount} notifications as read for user ${userId}`);

    return result.modifiedCount;
  }

  async archive(id: string, userId: string): Promise<Notification> {
    return this.notificationModel.findOneAndUpdate(
      { _id: id, userId },
      { status: NotificationStatus.ARCHIVED },
      { new: true },
    );
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.notificationModel.deleteOne({ _id: id, userId });
    return result.deletedCount > 0;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId,
      status: NotificationStatus.UNREAD,
    });
  }

  async getStatistics(userId: string) {
    const stats = await this.notificationModel.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: {
            type: '$type',
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await this.notificationModel.countDocuments({ userId });
    const unread = await this.getUnreadCount(userId);

    return {
      total,
      unread,
      read: total - unread,
      byType: stats.reduce((acc, stat) => {
        if (!acc[stat._id.type]) {
          acc[stat._id.type] = { total: 0, unread: 0, read: 0 };
        }
        acc[stat._id.type].total += stat.count;
        if (stat._id.status === NotificationStatus.UNREAD) {
          acc[stat._id.type].unread += stat.count;
        } else {
          acc[stat._id.type].read += stat.count;
        }
        return acc;
      }, {}),
    };
  }

  // ==================== NOTIFICATION HELPERS ====================

  async notifyGradeUpdate(
    userId: string,
    studentName: string,
    subject: string,
    score: number,
  ) {
    return this.create({
      userId,
      type: NotificationType.GRADE_UPDATED,
      title: 'Điểm số mới',
      message: `${studentName} vừa nhận điểm ${score} cho môn ${subject}`,
      priority: NotificationPriority.MEDIUM,
      sendPush: true,
      data: {
        studentName,
        subject,
        score,
        link: '/scores',
      },
    });
  }

  async notifyAttendance(
    userId: string,
    studentName: string,
    status: string,
    date: string,
  ) {
    return this.create({
      userId,
      type: NotificationType.ATTENDANCE_MARKED,
      title: 'Điểm danh',
      message: `${studentName} được điểm danh ${status} vào ngày ${date}`,
      priority:
        status === 'absent' ? NotificationPriority.HIGH : NotificationPriority.LOW,
      sendPush: true,
      data: {
        studentName,
        status,
        date,
        link: '/attendance',
      },
    });
  }

  async notifyAssignment(
    userIds: string[],
    title: string,
    dueDate: string,
    className: string,
  ) {
    const notifications = userIds.map((userId) => ({
      userId,
      type: NotificationType.ASSIGNMENT_CREATED,
      title: 'Bài tập mới',
      message: `Bài tập "${title}" cho lớp ${className}. Hạn nộp: ${dueDate}`,
      priority: NotificationPriority.MEDIUM,
      sendPush: true,
      data: {
        title,
        dueDate,
        className,
        link: '/assignments',
      },
    }));

    return this.createBulk(notifications);
  }

  async notifyPaymentDue(userId: string, amount: number, dueDate: string) {
    return this.create({
      userId,
      type: NotificationType.PAYMENT_DUE,
      title: 'Thông báo học phí',
      message: `Bạn có khoản học phí ${amount.toLocaleString('vi-VN')} VNĐ sắp đến hạn vào ${dueDate}`,
      priority: NotificationPriority.HIGH,
      sendEmail: true,
      sendPush: true,
      data: {
        amount,
        dueDate,
        link: '/payments',
      },
    });
  }

  async notifyAnnouncement(
    userIds: string[],
    title: string,
    message: string,
    imageUrl?: string,
  ) {
    const notifications = userIds.map((userId) => ({
      userId,
      type: NotificationType.ANNOUNCEMENT,
      title,
      message,
      priority: NotificationPriority.MEDIUM,
      sendPush: true,
      data: {
        imageUrl,
        link: '/announcements',
      },
    }));

    return this.createBulk(notifications);
  }

  // ==================== SCHEDULED TASKS ====================

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldNotifications() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.notificationModel.deleteMany({
      status: NotificationStatus.READ,
      readAt: { $lt: thirtyDaysAgo },
    });

    this.logger.log(
      `Cleaned up ${result.deletedCount} old read notifications`,
    );
  }

  // ==================== NOTIFICATION SENDING METHODS ====================

  private async sendEmailNotification(notification: Notification) {
    try {
      // TODO: Implement email sending using nodemailer
      this.logger.log(
        `Sending email notification ${notification._id} to user ${notification.userId}`,
      );

      await this.notificationModel.updateOne(
        { _id: notification._id },
        {
          emailSent: true,
          emailSentAt: new Date(),
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email notification: ${error.message}`,
        error.stack,
      );
    }
  }

  private async sendSMSNotification(notification: Notification) {
    try {
      // TODO: Implement SMS sending using Twilio or similar
      this.logger.log(
        `Sending SMS notification ${notification._id} to user ${notification.userId}`,
      );

      await this.notificationModel.updateOne(
        { _id: notification._id },
        {
          smsSent: true,
          smsSentAt: new Date(),
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send SMS notification: ${error.message}`,
        error.stack,
      );
    }
  }

  private async sendPushNotification(notification: Notification) {
    try {
      // TODO: Implement push notification using Firebase Cloud Messaging
      this.logger.log(
        `Sending push notification ${notification._id} to user ${notification.userId}`,
      );

      await this.notificationModel.updateOne(
        { _id: notification._id },
        {
          pushSent: true,
          pushSentAt: new Date(),
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to send push notification: ${error.message}`,
        error.stack,
      );
    }
  }
}
