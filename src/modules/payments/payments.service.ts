import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentStatus, PaymentMethod } from './entities/payment.entity';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { VNPayGateway } from './gateways/vnpay.gateway';
import { MoMoGateway } from './gateways/momo.gateway';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Student } from '../students/entities/student.entity';
import { Class } from '../classes/entities/class.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name)
    private paymentModel: Model<Payment>,
    @InjectModel(Invoice.name)
    private invoiceModel: Model<Invoice>,
    private vnpayGateway: VNPayGateway,
    private momoGateway: MoMoGateway,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
  ) {}

  // ==================== INVOICE METHODS ====================

  async createInvoice(data: Partial<Invoice>): Promise<Invoice> {
    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = await this.invoiceModel.create({
      ...data,
      invoiceNumber,
      paidAmount: 0,
      status: InvoiceStatus.PENDING,
    });

    this.logger.log(`Created invoice ${invoiceNumber} for student ${data.studentId}`);

    return invoice;
  }

  async findInvoices(filters: {
    studentId?: string;
    parentId?: string;
    status?: InvoiceStatus;
    academicYear?: string;
    semester?: string;
    limit?: number;
    skip?: number;
  }) {
    const query: any = {};
    if (filters.studentId) query.studentId = filters.studentId;
    if (filters.parentId) query.parentId = filters.parentId;
    if (filters.status) query.status = filters.status;
    if (filters.academicYear) query.academicYear = filters.academicYear;
    if (filters.semester) query.semester = filters.semester;

    const [data, total] = await Promise.all([
      this.invoiceModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50)
        .skip(filters.skip || 0)
        .exec(),
      this.invoiceModel.countDocuments(query),
    ]);

    return { data, total };
  }

  async getInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = await this.invoiceModel.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundException('Hóa đơn không tồn tại');
    }
    return invoice;
  }

  async updateInvoice(invoiceId: string, data: Partial<Invoice>): Promise<Invoice> {
    const invoice = await this.invoiceModel.findByIdAndUpdate(
      invoiceId,
      data,
      { new: true },
    );

    if (!invoice) {
      throw new NotFoundException('Hóa đơn không tồn tại');
    }

    return invoice;
  }

  async deleteInvoice(invoiceId: string): Promise<boolean> {
    const result = await this.invoiceModel.deleteOne({ _id: invoiceId });
    return result.deletedCount > 0;
  }

  // ==================== PAYMENT METHODS ====================

  async initiatePayment(data: {
    invoiceId: string;
    method: PaymentMethod;
    ipAddress: string;
    userAgent: string;
    bankCode?: string;
  }): Promise<{ paymentUrl?: string; payment: Payment }> {
    // Get invoice
    const invoice = await this.getInvoice(data.invoiceId);

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Hóa đơn đã được thanh toán');
    }

    if (invoice.remainingAmount <= 0) {
      throw new BadRequestException('Không còn số tiền cần thanh toán');
    }

    // Create payment record
    const txnRef = this.generateTxnRef();
    const payment = await this.paymentModel.create({
      invoiceId: data.invoiceId,
      studentId: invoice.studentId,
      studentName: invoice.studentName,
      parentId: invoice.parentId,
      parentName: invoice.parentName,
      amount: invoice.remainingAmount,
      discount: 0,
      fee: 0,
      totalAmount: invoice.remainingAmount,
      method: data.method,
      type: invoice.items[0]?.type || 'tuition',
      status: PaymentStatus.PENDING,
      description: `Thanh toán ${invoice.invoiceNumber}`,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      vnpTxnRef: txnRef,
    });

    this.logger.log(`Initiated payment ${payment._id} for invoice ${data.invoiceId}`);

    // Generate payment URL based on method
    let paymentUrl: string | undefined;

    if (data.method === PaymentMethod.VNPAY) {
      paymentUrl = this.vnpayGateway.createPaymentUrl({
        amount: invoice.remainingAmount,
        orderInfo: `Thanh toán ${invoice.invoiceNumber}`,
        orderType: 'billpayment',
        txnRef,
        ipAddr: data.ipAddress,
        bankCode: data.bankCode,
      });
    } else if (data.method === PaymentMethod.MOMO) {
      const momoResult = await this.momoGateway.createPayment({
        orderId: txnRef,
        amount: invoice.remainingAmount,
        orderInfo: `Thanh toán ${invoice.invoiceNumber}`,
      });

      if (momoResult.success) {
        paymentUrl = momoResult.payUrl;
        payment.momoRequestId = momoResult.data.requestId;
        await payment.save();
      } else {
        payment.status = PaymentStatus.FAILED;
        payment.errorMessage = momoResult.message;
        await payment.save();
        throw new BadRequestException(`Lỗi tạo thanh toán MoMo: ${momoResult.message}`);
      }
    }

    return { paymentUrl, payment };
  }

  async handleVNPayReturn(params: any): Promise<{
    success: boolean;
    message: string;
    payment?: Payment;
  }> {
    const verification = this.vnpayGateway.verifyIpnCall(params);

    if (!verification.isValid) {
      this.logger.error('VNPay IPN verification failed');
      return {
        success: false,
        message: 'Xác thực giao dịch thất bại',
      };
    }

    const { data } = verification;

    // Find payment by txnRef
    const payment = await this.paymentModel.findOne({
      vnpTxnRef: data.txnRef,
    });

    if (!payment) {
      this.logger.error(`Payment not found for txnRef ${data.txnRef}`);
      return {
        success: false,
        message: 'Không tìm thấy giao dịch',
      };
    }

    // Update payment
    payment.status = data.isSuccess ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;
    payment.transactionId = data.transactionNo;
    payment.vnpTransactionNo = data.transactionNo;
    payment.vnpBankCode = data.bankCode;
    payment.vnpCardType = data.cardType;
    payment.gatewayResponse = JSON.stringify(params);

    if (data.isSuccess) {
      payment.paidAt = new Date();

      // Update invoice
      await this.updateInvoicePayment(payment.invoiceId, payment.totalAmount);
    }

    await payment.save();

    this.logger.log(
      `VNPay payment ${payment._id} ${data.isSuccess ? 'completed' : 'failed'}`,
    );

    return {
      success: data.isSuccess,
      message: data.isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại',
      payment,
    };
  }

  async handleMoMoReturn(body: any): Promise<{
    success: boolean;
    message: string;
    payment?: Payment;
  }> {
    const verification = this.momoGateway.verifyIpnCall(body);

    if (!verification.isValid) {
      this.logger.error('MoMo IPN verification failed');
      return {
        success: false,
        message: 'Xác thực giao dịch thất bại',
      };
    }

    const { data } = verification;

    // Find payment by orderId
    const payment = await this.paymentModel.findOne({
      vnpTxnRef: data.orderId, // We use vnpTxnRef for storing txnRef/orderId
    });

    if (!payment) {
      this.logger.error(`Payment not found for orderId ${data.orderId}`);
      return {
        success: false,
        message: 'Không tìm thấy giao dịch',
      };
    }

    // Update payment
    payment.status = data.isSuccess ? PaymentStatus.COMPLETED : PaymentStatus.FAILED;
    payment.transactionId = data.transId;
    payment.momoTransId = data.transId;
    payment.momoPaymentType = data.payType;
    payment.gatewayResponse = JSON.stringify(body);

    if (data.isSuccess) {
      payment.paidAt = new Date();

      // Update invoice
      await this.updateInvoicePayment(payment.invoiceId, payment.totalAmount);
    }

    await payment.save();

    this.logger.log(
      `MoMo payment ${payment._id} ${data.isSuccess ? 'completed' : 'failed'}`,
    );

    return {
      success: data.isSuccess,
      message: data.isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại',
      payment,
    };
  }

  async findPayments(filters: {
    invoiceId?: string;
    studentId?: string;
    parentId?: string;
    status?: PaymentStatus;
    method?: PaymentMethod;
    limit?: number;
    skip?: number;
  }) {
    const query: any = {};
    if (filters.invoiceId) query.invoiceId = filters.invoiceId;
    if (filters.studentId) query.studentId = filters.studentId;
    if (filters.parentId) query.parentId = filters.parentId;
    if (filters.status) query.status = filters.status;
    if (filters.method) query.method = filters.method;

    const [data, total] = await Promise.all([
      this.paymentModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50)
        .skip(filters.skip || 0)
        .exec(),
      this.paymentModel.countDocuments(query),
    ]);

    return { data, total };
  }

  async getPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentModel.findById(paymentId);
    if (!payment) {
      throw new NotFoundException('Giao dịch không tồn tại');
    }
    return payment;
  }

  async refundPayment(paymentId: string, reason: string): Promise<Payment> {
    const payment = await this.getPayment(paymentId);

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Chỉ có thể hoàn tiền cho giao dịch đã hoàn thành');
    }

    // Process refund based on method
    if (payment.method === PaymentMethod.VNPAY && payment.vnpTransactionNo) {
      await this.vnpayGateway.refundTransaction({
        txnRef: payment.vnpTxnRef,
        amount: payment.totalAmount,
        transDate: payment.paidAt.toISOString().replace(/[-:]/g, '').slice(0, 14),
        transactionNo: payment.vnpTransactionNo,
        createBy: 'admin',
      });
    } else if (payment.method === PaymentMethod.MOMO && payment.momoTransId) {
      await this.momoGateway.refundTransaction({
        orderId: payment.vnpTxnRef,
        transId: payment.momoTransId,
        amount: payment.totalAmount,
        description: reason,
      });
    }

    // Update payment status
    payment.status = PaymentStatus.REFUNDED;
    payment.refundedAt = new Date();
    payment.refundReason = reason;
    await payment.save();

    // Update invoice
    await this.updateInvoicePayment(payment.invoiceId, -payment.totalAmount);

    this.logger.log(`Refunded payment ${paymentId}`);

    return payment;
  }

  async getPaymentStatistics(filters: {
    startDate?: Date;
    endDate?: Date;
    studentId?: string;
    parentId?: string;
  }) {
    const matchStage: any = {};
    if (filters.startDate || filters.endDate) {
      matchStage.createdAt = {};
      if (filters.startDate) matchStage.createdAt.$gte = filters.startDate;
      if (filters.endDate) matchStage.createdAt.$lte = filters.endDate;
    }
    if (filters.studentId) matchStage.studentId = filters.studentId;
    if (filters.parentId) matchStage.parentId = filters.parentId;

    const [paymentStats, invoiceStats] = await Promise.all([
      this.paymentModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              status: '$status',
              method: '$method',
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
          },
        },
      ]),
      this.invoiceModel.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            paidAmount: { $sum: '$paidAmount' },
            remainingAmount: { $sum: '$remainingAmount' },
          },
        },
      ]),
    ]);

    return {
      payments: paymentStats,
      invoices: invoiceStats,
    };
  }

  // ==================== HELPER METHODS ====================

  private async updateInvoicePayment(invoiceId: string, amount: number): Promise<void> {
    const invoice = await this.getInvoice(invoiceId);
    invoice.paidAmount += amount;
    await invoice.save();
  }

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    // Count invoices this month
    const count = await this.invoiceModel.countDocuments({
      invoiceNumber: new RegExp(`^INV${year}${month}`),
    });

    return `INV${year}${month}${String(count + 1).padStart(4, '0')}`;
  }

  async getTuitionStatement(studentId: string) {
    // 1. Lấy thông tin học sinh và lớp
    const student = await this.studentRepository.findOne({
      where: { id: studentId },
      relations: ['currentClass'],
    });

    if (!student) {
      throw new NotFoundException('Không tìm thấy thông tin học sinh');
    }

    // 2. Xác định mức phí dựa trên khối lớp (Grade)
    // Giả sử: Lớp tên bắt đầu bằng "1", "2" là khối tiểu học, "6", "7" là khối trung học...
    const className = student.currentClass?.name || '';
    const gradePrefix = className.charAt(0);
    
    let baseTuition = 3500000; // Mặc định
    if (['6', '7', '8', '9'].includes(gradePrefix)) {
      baseTuition = 4500000; // Khối trung học
    } else if (['3', '4', '5'].includes(gradePrefix)) {
      baseTuition = 3800000; // Khối tiểu học lớn
    }

    // 3. Tạo dữ liệu bảng kê (Statement)
    // Trong thực tế sẽ lấy từ Invoice model, ở đây mình kết hợp logic động để test 100 học sinh
    return {
      totalDue: baseTuition + 1200000, // Học phí + Tiền ăn
      deadline: '25/09/2023',
      items: [
        {
          id: 'item1',
          name: `Học phí tháng 9`,
          amount: baseTuition,
          period: 'Tháng 9/2023',
          dueDate: '25/09/2023',
          status: 'unpaid',
        },
        {
          id: 'item2',
          name: 'Tiền ăn bán trú T9',
          amount: 1200000,
          period: 'Tháng 9/2023',
          dueDate: '25/09/2023',
          status: 'unpaid',
        },
         {
          id: 'item3',
          name: 'Quỹ lớp kỳ 1',
          amount: 500000,
          period: 'Tháng HK1',
          dueDate: '15/09/2023',
          status: 'paid',
        }
      ],
    };
  }

  private generateTxnRef(): string {
    return `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
}
