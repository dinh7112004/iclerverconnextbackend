import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as querystring from 'querystring';

export interface VNPayConfig {
  tmnCode: string;
  secretKey: string;
  url: string;
  returnUrl: string;
  apiUrl?: string;
}

export interface CreatePaymentUrlParams {
  amount: number;
  orderInfo: string;
  orderType: string;
  txnRef: string;
  ipAddr: string;
  locale?: string;
  bankCode?: string;
}

@Injectable()
export class VNPayGateway {
  private readonly logger = new Logger(VNPayGateway.name);
  private config: VNPayConfig;

  constructor() {
    // Load config from environment variables
    this.config = {
      tmnCode: process.env.VNPAY_TMN_CODE || '',
      secretKey: process.env.VNPAY_SECRET_KEY || '',
      url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      returnUrl: process.env.VNPAY_RETURN_URL || 'http://localhost:3000/payment/vnpay/return',
      apiUrl: process.env.VNPAY_API_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction',
    };
  }

  /**
   * Tạo URL thanh toán VNPay
   */
  createPaymentUrl(params: CreatePaymentUrlParams): string {
    try {
      const createDate = this.formatDate(new Date());
      const expireDate = this.formatDate(
        new Date(Date.now() + 15 * 60 * 1000),
      ); // 15 minutes

      let vnpParams: any = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: this.config.tmnCode,
        vnp_Amount: params.amount * 100, // VNPay yêu cầu số tiền * 100
        vnp_CreateDate: createDate,
        vnp_CurrCode: 'VND',
        vnp_IpAddr: params.ipAddr,
        vnp_Locale: params.locale || 'vn',
        vnp_OrderInfo: params.orderInfo,
        vnp_OrderType: params.orderType,
        vnp_ReturnUrl: this.config.returnUrl,
        vnp_TxnRef: params.txnRef,
        vnp_ExpireDate: expireDate,
      };

      if (params.bankCode) {
        vnpParams.vnp_BankCode = params.bankCode;
      }

      // Sort parameters alphabetically
      vnpParams = this.sortObject(vnpParams);

      // Create signature
      const signData = querystring.stringify(vnpParams);
      const hmac = crypto.createHmac('sha512', this.config.secretKey);
      const signature = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      vnpParams.vnp_SecureHash = signature;

      const paymentUrl =
        this.config.url + '?' + querystring.stringify(vnpParams);

      this.logger.log(`Created VNPay payment URL for transaction ${params.txnRef}`);

      return paymentUrl;
    } catch (error) {
      this.logger.error(`Error creating VNPay payment URL: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Xác thực IPN (Instant Payment Notification) từ VNPay
   */
  verifyIpnCall(vnpParams: any): {
    isValid: boolean;
    message: string;
    data?: any;
  } {
    try {
      const secureHash = vnpParams.vnp_SecureHash;
      delete vnpParams.vnp_SecureHash;
      delete vnpParams.vnp_SecureHashType;

      const sortedParams = this.sortObject(vnpParams);
      const signData = querystring.stringify(sortedParams);
      const hmac = crypto.createHmac('sha512', this.config.secretKey);
      const checkSum = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      if (secureHash !== checkSum) {
        this.logger.warn('Invalid VNPay IPN signature');
        return {
          isValid: false,
          message: 'Checksum failed',
        };
      }

      const responseCode = vnpParams.vnp_ResponseCode;
      const transactionStatus = vnpParams.vnp_TransactionStatus;

      this.logger.log(
        `VNPay IPN verified: ${vnpParams.vnp_TxnRef}, status: ${responseCode}`,
      );

      return {
        isValid: true,
        message: 'Success',
        data: {
          txnRef: vnpParams.vnp_TxnRef,
          amount: parseInt(vnpParams.vnp_Amount) / 100,
          orderInfo: vnpParams.vnp_OrderInfo,
          responseCode,
          transactionStatus,
          transactionNo: vnpParams.vnp_TransactionNo,
          bankCode: vnpParams.vnp_BankCode,
          cardType: vnpParams.vnp_CardType,
          payDate: vnpParams.vnp_PayDate,
          isSuccess: responseCode === '00' && transactionStatus === '00',
        },
      };
    } catch (error) {
      this.logger.error(`Error verifying VNPay IPN: ${error.message}`, error.stack);
      return {
        isValid: false,
        message: error.message,
      };
    }
  }

  /**
   * Truy vấn giao dịch từ VNPay
   */
  async queryTransaction(txnRef: string, transDate: string): Promise<any> {
    try {
      const requestId = this.generateRequestId();
      const createDate = this.formatDate(new Date());

      const data: any = {
        vnp_RequestId: requestId,
        vnp_Version: '2.1.0',
        vnp_Command: 'querydr',
        vnp_TmnCode: this.config.tmnCode,
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: `Query transaction ${txnRef}`,
        vnp_TransactionDate: transDate,
        vnp_CreateDate: createDate,
        vnp_IpAddr: '127.0.0.1',
      };

      const sortedData = this.sortObject(data);
      const signData = querystring.stringify(sortedData);
      const hmac = crypto.createHmac('sha512', this.config.secretKey);
      const signature = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      data.vnp_SecureHash = signature;

      // TODO: Implement actual HTTP call to VNPay API
      this.logger.log(`Querying VNPay transaction ${txnRef}`);

      return {
        success: true,
        message: 'Query submitted',
      };
    } catch (error) {
      this.logger.error(`Error querying VNPay transaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Hoàn tiền
   */
  async refundTransaction(params: {
    txnRef: string;
    amount: number;
    transDate: string;
    transactionNo: string;
    createBy: string;
  }): Promise<any> {
    try {
      const requestId = this.generateRequestId();
      const createDate = this.formatDate(new Date());

      const data: any = {
        vnp_RequestId: requestId,
        vnp_Version: '2.1.0',
        vnp_Command: 'refund',
        vnp_TmnCode: this.config.tmnCode,
        vnp_TransactionType: '02',
        vnp_TxnRef: params.txnRef,
        vnp_Amount: params.amount * 100,
        vnp_OrderInfo: `Refund ${params.txnRef}`,
        vnp_TransactionNo: params.transactionNo,
        vnp_TransactionDate: params.transDate,
        vnp_CreateBy: params.createBy,
        vnp_CreateDate: createDate,
        vnp_IpAddr: '127.0.0.1',
      };

      const sortedData = this.sortObject(data);
      const signData = querystring.stringify(sortedData);
      const hmac = crypto.createHmac('sha512', this.config.secretKey);
      const signature = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

      data.vnp_SecureHash = signature;

      // TODO: Implement actual HTTP call to VNPay API
      this.logger.log(`Refunding VNPay transaction ${params.txnRef}`);

      return {
        success: true,
        message: 'Refund submitted',
      };
    } catch (error) {
      this.logger.error(`Error refunding VNPay transaction: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  private sortObject(obj: any): any {
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    keys.forEach((key) => {
      sorted[key] = obj[key];
    });
    return sorted;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  private generateRequestId(): string {
    return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
}
