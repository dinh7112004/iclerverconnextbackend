import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  VNPAY = 'vnpay',
  MOMO = 'momo',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
}

export enum PaymentType {
  TUITION = 'tuition',
  REGISTRATION = 'registration',
  UNIFORM = 'uniform',
  MEAL = 'meal',
  TRANSPORTATION = 'transportation',
  EXTRACURRICULAR = 'extracurricular',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class Payment extends Document {
  @Prop({ required: true })
  invoiceId: string;

  @Prop({ required: true })
  studentId: string;

  @Prop()
  studentName: string;

  @Prop()
  parentId: string;

  @Prop()
  parentName: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ default: 0 })
  fee: number;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ enum: PaymentMethod, required: true })
  method: PaymentMethod;

  @Prop({ enum: PaymentType, required: true })
  type: PaymentType;

  @Prop({ enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop()
  description: string;

  @Prop()
  transactionId: string; // ID từ payment gateway

  @Prop()
  gatewayResponse: string; // Response từ gateway (JSON string)

  @Prop()
  ipAddress: string;

  @Prop()
  userAgent: string;

  @Prop()
  paidAt: Date;

  @Prop()
  refundedAt: Date;

  @Prop()
  refundReason: string;

  @Prop()
  note: string;

  // VNPay specific fields
  @Prop()
  vnpTxnRef: string;

  @Prop()
  vnpTransactionNo: string;

  @Prop()
  vnpBankCode: string;

  @Prop()
  vnpCardType: string;

  // Momo specific fields
  @Prop()
  momoTransId: string;

  @Prop()
  momoRequestId: string;

  @Prop()
  errorMessage: string;

  @Prop()
  momoPaymentType: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Indexes
PaymentSchema.index({ invoiceId: 1 });
PaymentSchema.index({ studentId: 1, createdAt: -1 });
PaymentSchema.index({ parentId: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });
