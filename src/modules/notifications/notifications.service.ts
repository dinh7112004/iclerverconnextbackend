import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from './entities/notification.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../students/entities/student.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums/role.enum';
import { Class } from '../classes/entities/class.entity';
import { Parent } from '../parents/entities/parent.entity';
import { StudentParentRelation } from '../parents/entities/student-parent-relation.entity';

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
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
    @InjectRepository(Parent)
    private parentRepository: Repository<Parent>,
    @InjectRepository(StudentParentRelation)
    private relationRepository: Repository<StudentParentRelation>,
  ) { }

  async onModuleInit() {
    try {
      // 1. Only seed if no global news/activities exist to prevent overwriting user data
      const globalCount = await this.notificationModel.countDocuments({ userId: 'all' });
      if (globalCount > 0) {
        this.logger.log('📢 Global notifications already exist, skipping seed.');
        return;
      }
      
      const parents = await this.userRepository.find({ 
        where: { role: UserRole.PARENT },
        take: 10 // Chỉ seed cho 10 phụ huynh để khởi động nhanh
      });
      if (parents.length === 0) return;

      this.logger.log(`🌱 Seeding rich notifications for ${parents.length} parents...`);
      const seeds = [];
      
      for (const parentUser of parents) {
        // Find children for this parent
        const parentProfile = await this.parentRepository.findOne({ where: { userId: parentUser.id } });
        if (!parentProfile) continue;

        const relations = await this.relationRepository.find({ 
          where: { parentId: parentProfile.id },
          relations: ['student'] 
        });

        for (const relation of relations) {
          const studentName = relation.student?.fullName || 'Con';
          
          // 2. Urgent Notifications (Personalized with student name)
          seeds.push({
            userId: parentUser.id,
            type: NotificationType.ANNOUNCEMENT,
            title: 'Hệ thống điểm danh',
            message: `⚠️ BÉ ${studentName.toUpperCase()} VẮNG MẶT KHÔNG PHÉP\n\nHệ thống ghi nhận học sinh vắng mặt tại buổi điểm danh sáng. Phụ huynh vui lòng kiểm tra.`,
            priority: NotificationPriority.URGENT,
            status: NotificationStatus.UNREAD,
            data: {
              sourceName: 'Hệ thống điểm danh',
              sourceIcon: 'warning-outline',
              badge: 'KHẨN CẤP',
              time: '08:00',
              date: '12/09/2023',
            },
            createdAt: new Date(),
          });

          seeds.push({
            userId: parentUser.id,
            type: NotificationType.PAYMENT_DUE,
            title: `Nhắc nhở: Hạn đóng học phí T9 - ${studentName}`,
            message: `Quý phụ huynh vui lòng hoàn thành đóng học phí tháng 9 cho bé ${studentName} trước ngày 30/09/2023.`,
            priority: NotificationPriority.HIGH,
            status: NotificationStatus.UNREAD,
            data: {
              sourceName: 'Phòng Tài chính',
              sourceIcon: 'card-outline',
              badge: 'Học phí',
              time: '10:00',
              date: '20/09/2023',
            },
            createdAt: new Date(),
          });
        }
      }

      if (seeds.length > 0) {
        await this.notificationModel.insertMany(seeds);
        this.logger.log(`✅ Seeded ${seeds.length} targeted notifications for families`);
      }

      // 4. Seed Global News & Activities (For "Tin tức & Hoạt động" section)
      const newsCount = await this.notificationModel.countDocuments({ type: NotificationType.NEWS });
      if (newsCount === 0) {
        this.logger.log('🌱 Seeding global news and activities...');
        const globalSeeds = [];
        
        // School News (Global)
        globalSeeds.push({
          userId: 'all',
          type: NotificationType.NEWS,
          title: 'Lễ khai giảng năm học mới 2023-2024',
          message: 'Chào mừng các em học sinh quay trở lại trường sau kỳ nghỉ hè rực rỡ. Chúc các em một năm học mới đầy hứng khởi.',
          priority: NotificationPriority.LOW,
          status: NotificationStatus.UNREAD,
          data: {
            imageUrl: 'https://images.unsplash.com/photo-1524069290683-0457abfe42c3?auto=format&fit=crop&q=80&w=800',
            badge: 'HOẠT ĐỘNG TRƯỜNG',
            time: '07:30',
            date: '05/09/2023',
          },
          createdAt: new Date(),
        });

        globalSeeds.push({
          userId: 'all',
          type: NotificationType.NEWS,
          title: 'Ngày hội STEM - Khơi nguồn sáng tạo',
          message: 'Các em học sinh tham gia các gian hàng khoa học, tự tay chế tạo các mô hình robotics và thí nghiệm hóa học vui.',
          priority: NotificationPriority.LOW,
          status: NotificationStatus.UNREAD,
          data: {
            imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800',
            badge: 'HOẠT ĐỘNG TRƯỜNG',
            time: '09:00',
            date: '10/10/2023',
          },
          createdAt: new Date(),
        });

        // Class Activities (Limit to first 3 classes to keep seeding fast)
        const classes = await this.classRepository.find({ take: 3 });
        for (const cls of classes) {
          globalSeeds.push({
            userId: 'all',
            type: NotificationType.ACTIVITY,
            title: `Hoạt động trải nghiệm: "Sắc màu văn hóa" - Lớp ${cls.name}`,
            message: `Các bạn học sinh lớp ${cls.name} đã có một buổi trải nghiệm thú vị về các nét văn hóa đặc trưng của các vùng miền.`,
            priority: NotificationPriority.LOW,
            status: NotificationStatus.UNREAD,
            data: {
              classId: cls.id,
              imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800',
              badge: 'HOẠT ĐỘNG LỚP',
              time: '14:00',
              date: '10/09/2023',
            },
            createdAt: new Date(),
          });
        }

        await this.notificationModel.insertMany(globalSeeds);
        this.logger.log(`✅ Seeded ${globalSeeds.length} global news and activities`);
      }
      } catch (error) {
      this.logger.error('Error seeding notifications:', error);
    }
  }

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
      classId?: string;
    } = {},
  ): Promise<{ data: Notification[]; total: number }> {
    // Current user can see their own notifications AND global ones ('all')
    const query: any = {
      $or: [{ userId }, { userId: 'all' }],
    };

    if (options.status) query.status = options.status;
    if (options.type) query.type = options.type;

    // If it's a class-specific activity request
    if (options.classId) {
      query['data.classId'] = options.classId;
    }

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

  async toggleLike(id: string, userId: string): Promise<Notification> {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid notification ID');
    }
    const notification = await this.notificationModel.findById(id);
    if (!notification) return null;

    const likes = notification.likes || [];
    const index = likes.indexOf(userId);

    if (index > -1) {
      likes.splice(index, 1); // Unlike
    } else {
      likes.push(userId); // Like
    }

    return this.notificationModel.findByIdAndUpdate(
      id,
      { likes },
      { new: true },
    );
  }

  async addComment(
    id: string,
    userId: string,
    content: string,
    providedUserName?: string,
    providedUserAvatar?: string,
    providedUserRole?: string
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid notification ID');
    }

    let userName = providedUserName || 'Người dùng';
    let userAvatar = providedUserAvatar || '';
    let userRole = providedUserRole || 'PARENT';

    if (!providedUserName || !providedUserAvatar || !providedUserRole) {
      const user = await this.userRepository.findOneBy({ id: userId as any });
      if (user) {
        userName = providedUserName || user.fullName || 'Người dùng';
        userAvatar = providedUserAvatar || user.avatarUrl || '';
        userRole = providedUserRole || user.role || 'PARENT';
      }
    }

    const comment = {
      userId,
      userName,
      userAvatar,
      userRole,
      content,
      createdAt: new Date(),
    };
    return this.notificationModel.findByIdAndUpdate(
      id,
      {
        $push: {
          comments: comment,
        },
      },
      { new: true },
    ).exec();
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
