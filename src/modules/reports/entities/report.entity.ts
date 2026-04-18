import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum ReportType {
  ATTENDANCE = 'attendance',
  GRADES = 'grades',
  STUDENT_PERFORMANCE = 'student_performance',
  CLASS_SUMMARY = 'class_summary',
  TEACHER_PERFORMANCE = 'teacher_performance',
  FINANCIAL = 'financial',
  AI_USAGE = 'ai_usage',
  CUSTOM = 'custom',
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
}

export enum ReportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ReportSchedule {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  ONCE = 'once',
}

@Schema({ timestamps: true })
export class Report extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true, enum: ReportType })
  type: ReportType;

  @Prop({ enum: ReportFormat, default: ReportFormat.PDF })
  format: ReportFormat;

  @Prop({ enum: ReportStatus, default: ReportStatus.PENDING })
  status: ReportStatus;

  @Prop({ type: Object })
  filters?: {
    startDate?: Date;
    endDate?: Date;
    classId?: string;
    studentId?: string;
    teacherId?: string;
    subjectId?: string;
    gradeLevel?: string;
    [key: string]: any;
  };

  @Prop({ type: Object })
  config?: {
    includeCharts?: boolean;
    includeStatistics?: boolean;
    groupBy?: string;
    sortBy?: string;
    limit?: number;
    [key: string]: any;
  };

  @Prop()
  generatedBy: string; // userId

  @Prop({ type: Object })
  data?: any;

  @Prop()
  fileUrl?: string;

  @Prop()
  errorMessage?: string;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ default: false })
  isScheduled: boolean;

  @Prop({ enum: ReportSchedule })
  schedule?: ReportSchedule;

  @Prop()
  nextRunAt?: Date;

  @Prop({ type: [String], default: [] })
  recipients: string[]; // email addresses

  @Prop({ default: false })
  sendEmail: boolean;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

// Indexes
ReportSchema.index({ generatedBy: 1, createdAt: -1 });
ReportSchema.index({ type: 1, status: 1 });
ReportSchema.index({ isScheduled: 1, nextRunAt: 1 });
