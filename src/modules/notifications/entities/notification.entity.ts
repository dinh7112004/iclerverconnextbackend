import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum NotificationType {
  GRADE_UPDATED = 'grade_updated',
  ATTENDANCE_MARKED = 'attendance_marked',
  ASSIGNMENT_CREATED = 'assignment_created',
  ASSIGNMENT_DUE = 'assignment_due',
  MESSAGE_RECEIVED = 'message_received',
  ANNOUNCEMENT = 'announcement',
  PAYMENT_DUE = 'payment_due',
  PAYMENT_RECEIVED = 'payment_received',
  CLASS_SCHEDULE_CHANGED = 'class_schedule_changed',
  EXAM_SCHEDULED = 'exam_scheduled',
  REPORT_READY = 'report_ready',
  SYSTEM_ALERT = 'system_alert',
  NEWS = 'news',
  ACTIVITY = 'activity',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived',
}

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ required: true })
  userId: string; // The target user (for individual notifications) or 'all' for broadcasts

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ enum: NotificationPriority, default: NotificationPriority.MEDIUM })
  priority: NotificationPriority;

  @Prop({ enum: NotificationStatus, default: NotificationStatus.UNREAD })
  status: NotificationStatus;

  @Prop({ type: Object })
  data?: {
    entityId?: string;
    entityType?: string;
    link?: string;
    imageUrl?: string;
    actionLabel?: string;
    actionUrl?: string;
    classId?: string; // Target specific class
    schoolId?: string; // Target specific school
    [key: string]: any;
  };

  @Prop({ type: [String], default: [] })
  likes: string[]; // List of user IDs who liked this

  @Prop({
    type: [
      {
        userId: String,
        userName: String,
        userAvatar: String,
        content: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  comments: {
    userId: string;
    userName?: string;
    userAvatar?: string;
    userRole?: string;
    content: string;
    createdAt: Date;
  }[];

  @Prop()
  readAt?: Date;

  @Prop()
  expiresAt?: Date;

  @Prop({ default: false })
  sendEmail: boolean;

  @Prop({ default: false })
  sendSMS: boolean;

  @Prop({ default: false })
  sendPush: boolean;

  @Prop({ default: false })
  emailSent: boolean;

  @Prop({ default: false })
  smsSent: boolean;

  @Prop({ default: false })
  pushSent: boolean;

  @Prop()
  emailSentAt?: Date;

  @Prop()
  smsSentAt?: Date;

  @Prop()
  pushSentAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes for performance
NotificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
