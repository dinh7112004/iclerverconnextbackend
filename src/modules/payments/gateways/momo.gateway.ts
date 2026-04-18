import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';

export interface MoMoConfig {
  partnerCode: string;
  accessKey: string;
  secretKey: string;
  endpoint: string;
  redirectUrl: string;
  ipnUrl: string;
}

export interface CreatePaymentParams {
  orderId: string;
  amount: number;
  orderInfo: string;
  requestId?: string;
  extraData?: string;
}

@Injectable()
export class MoMoGateway {
  private readonly logger = new Logger(MoMoGateway.name);
  private config: MoMoConfig;

  constructor() {
    // Load config from environment variables
    this.config = {
      partnerCode: process.env.MOMO_PARTNER_CODE || '',
      accessKey: process.env.MOMO_ACCESS_KEY || '',
      secretKey: process.env.MOMO_SECRET_KEY || '',
      endpoint: process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create',
      redirectUrl: process.env.MOMO_REDIRECT_URL || 'http://localhost:3000/payment/momo/return',
      ipnUrl: process.env.MOMO_IPN_URL || 'http://localhost:3001/api/payments/momo/ipn',
    };
  }

  /**
   * Tạo request thanh toán MoMo
   */
  async createPayment(params: CreatePaymentParams): Promise<{
    success: boolean;
    payUrl?: string;
    message?: string;
    data?: any;
  }> {
    try {
      const requestId = params.requestId || this.generateRequestId();
      const orderId = params.orderId;
      const orderInfo = params.orderInfo;
      const amount = params.amount.toString();
      const extraData = params.extraData || '';

      // Create signature
      const rawSignature = `accessKey=${this.config.accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${this.config.ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${this.config.partnerCode}&redirectUrl=${this.config.redirectUrl}&requestId=${requestId}&requestType=captureWallet`;

      const signature = crypto
        .createHmac('sha256', this.config.secretKey)
        .update(rawSignature)
        .digest('hex');

      const requestBody = {
        partnerCode: this.config.partnerCode,
        accessKey: this.config.accessKey,
        requestId,
        amount,
        orderId,
        orderInfo,
        redirectUrl: this.config.redirectUrl,
        ipnUrl: this.config.ipnUrl,
        requestType: 'captureWallet',
        extraData,
        lang: 'vi',
        signature,
      };

      this.logger.log(`Creating MoMo payment for order ${orderId}`);

      const response = await axios.post(this.config.endpoint, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data.resultCode === 0) {
        this.logger.log(`MoMo payment URL created for order ${orderId}`);
        return {
          success: true,
          payUrl: response.data.payUrl,
          data: response.data,
        };
      } else {
        this.logger.error(
          `MoMo payment creation failed: ${response.data.message}`,
        );
        return {
          success: false,
          message: response.data.message,
          data: response.data,
        };
      }
    } catch (error) {
      this.logger.error(
        `Error creating MoMo payment: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Xác thực IPN từ MoMo
   */
  verifyIpnCall(body: any): {
    isValid: boolean;
    message: string;
    data?: any;
  } {
    try {
      const {
        partnerCode,
        accessKey,
        requestId,
        amount,
        orderId,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature,
      } = body;

      // Recreate signature
      const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

      const checkSignature = crypto
        .createHmac('sha256', this.config.secretKey)
        .update(rawSignature)
        .digest('hex');

      if (signature !== checkSignature) {
        this.logger.warn('Invalid MoMo IPN signature');
        return {
          isValid: false,
          message: 'Invalid signature',
        };
      }

      this.logger.log(`MoMo IPN verified: ${orderId}, result: ${resultCode}`);

      return {
        isValid: true,
        message: 'Success',
        data: {
          orderId,
          amount: parseInt(amount),
          orderInfo,
          transId,
          resultCode,
          message,
          payType,
          responseTime,
          extraData,
          isSuccess: resultCode === 0,
        },
      };
    } catch (error) {
      this.logger.error(`Error verifying MoMo IPN: ${error.message}`, error.stack);
      return {
        isValid: false,
        message: error.message,
      };
    }
  }

  /**
   * Truy vấn trạng thái giao dịch
   */
  async queryTransaction(orderId: string, requestId?: string): Promise<any> {
    try {
      const reqId = requestId || this.generateRequestId();

      const rawSignature = `accessKey=${this.config.accessKey}&orderId=${orderId}&partnerCode=${this.config.partnerCode}&requestId=${reqId}`;

      const signature = crypto
        .createHmac('sha256', this.config.secretKey)
        .update(rawSignature)
        .digest('hex');

      const requestBody = {
        partnerCode: this.config.partnerCode,
        accessKey: this.config.accessKey,
        requestId: reqId,
        orderId,
        lang: 'vi',
        signature,
      };

      this.logger.log(`Querying MoMo transaction ${orderId}`);

      const response = await axios.post(
        this.config.endpoint.replace('/create', '/query'),
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error querying MoMo transaction: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Hoàn tiền
   */
  async refundTransaction(params: {
    orderId: string;
    transId: string;
    amount: number;
    description?: string;
  }): Promise<any> {
    try {
      const requestId = this.generateRequestId();
      const amount = params.amount.toString();
      const description = params.description || `Refund ${params.orderId}`;

      const rawSignature = `accessKey=${this.config.accessKey}&amount=${amount}&description=${description}&orderId=${params.orderId}&partnerCode=${this.config.partnerCode}&requestId=${requestId}&transId=${params.transId}`;

      const signature = crypto
        .createHmac('sha256', this.config.secretKey)
        .update(rawSignature)
        .digest('hex');

      const requestBody = {
        partnerCode: this.config.partnerCode,
        accessKey: this.config.accessKey,
        requestId,
        orderId: params.orderId,
        amount,
        transId: params.transId,
        description,
        lang: 'vi',
        signature,
      };

      this.logger.log(`Refunding MoMo transaction ${params.orderId}`);

      const response = await axios.post(
        this.config.endpoint.replace('/create', '/refund'),
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error refunding MoMo transaction: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  private generateRequestId(): string {
    return `MOMO${Date.now()}`;
  }
}
