import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum LeaveRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class LeaveRequest extends Document {
  createdAt: Date;
  updatedAt: Date;

  @Prop({ required: true })
  studentId: string;

  @Prop()
  classId: string;

  @Prop({ required: true })
  parentId: string;

  @Prop({ enum: ['day', 'period'], required: true })
  type: string;

  @Prop()
  fromDate: string; // ISO string

  @Prop()
  toDate: string; // ISO string

  @Prop()
  singleDate: string; // ISO string

  @Prop({ type: [Number] })
  periods: number[];

  @Prop({ required: true })
  reason: string;

  @Prop()
  attachmentUrl: string;

  @Prop({ enum: LeaveRequestStatus, default: LeaveRequestStatus.PENDING })
  status: string;

  @Prop()
  approvedBy: string;

  @Prop()
  rejectionReason: string;
}

export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequest);

// Indexes
LeaveRequestSchema.index({ studentId: 1, createdAt: -1 });
LeaveRequestSchema.index({ parentId: 1, createdAt: -1 });
LeaveRequestSchema.index({ classId: 1, status: 1 });
