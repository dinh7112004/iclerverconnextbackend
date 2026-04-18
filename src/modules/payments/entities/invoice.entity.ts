import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Invoice extends Document {
  @Prop({ required: true, unique: true })
  invoiceNumber: string;

  @Prop({ required: true })
  studentId: string;

  @Prop()
  studentName: string;

  @Prop()
  className: string;

  @Prop()
  parentId: string;

  @Prop()
  parentName: string;

  @Prop()
  parentEmail: string;

  @Prop()
  parentPhone: string;

  @Prop({ required: true })
  academicYear: string;

  @Prop({ required: true })
  semester: string;

  @Prop({ type: [Object], required: true })
  items: Array<{
    id: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    type: string;
  }>;

  @Prop({ required: true })
  subtotal: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ default: 0 })
  tax: number;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ default: 0 })
  paidAmount: number;

  @Prop({ required: true })
  remainingAmount: number;

  @Prop({ enum: InvoiceStatus, default: InvoiceStatus.PENDING })
  status: InvoiceStatus;

  @Prop({ required: true })
  dueDate: Date;

  @Prop()
  paidDate: Date;

  @Prop()
  note: string;

  @Prop({ type: [String], default: [] })
  paymentIds: string[]; // IDs of related payments

  @Prop({ default: false })
  emailSent: boolean;

  @Prop()
  emailSentAt: Date;

  @Prop({ default: false })
  smsSent: boolean;

  @Prop()
  smsSentAt: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// Indexes
InvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ studentId: 1, academicYear: 1, semester: 1 });
InvoiceSchema.index({ parentId: 1, createdAt: -1 });
InvoiceSchema.index({ status: 1, dueDate: 1 });
InvoiceSchema.index({ academicYear: 1, semester: 1 });

// Pre-save hook to calculate amounts
InvoiceSchema.pre('save', function (next) {
  if (this.isModified('items') || this.isModified('discount') || this.isModified('tax')) {
    // Calculate subtotal
    this.subtotal = this.items.reduce((sum, item) => sum + item.amount, 0);

    // Calculate total
    this.totalAmount = this.subtotal - this.discount + this.tax;

    // Calculate remaining
    this.remainingAmount = this.totalAmount - this.paidAmount;

    // Update status based on payment
    if (this.paidAmount === 0) {
      if (this.dueDate < new Date()) {
        this.status = InvoiceStatus.OVERDUE;
      } else {
        this.status = InvoiceStatus.PENDING;
      }
    } else if (this.paidAmount >= this.totalAmount) {
      this.status = InvoiceStatus.PAID;
      if (!this.paidDate) {
        this.paidDate = new Date();
      }
    } else {
      this.status = InvoiceStatus.PARTIALLY_PAID;
    }
  }

  next();
});
