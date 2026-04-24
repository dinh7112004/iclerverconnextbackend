import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
  Ip,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PaymentStatus, PaymentMethod } from './entities/payment.entity';
import { InvoiceStatus } from './entities/invoice.entity';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ==================== INVOICE ENDPOINTS ====================

  @Post('invoices')
  @ApiOperation({ summary: 'Tạo hóa đơn mới' })
  @ApiResponse({ status: 201, description: 'Hóa đơn đã được tạo' })
  async createInvoice(@Body() data: any) {
    return this.paymentsService.createInvoice(data);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Lấy danh sách hóa đơn' })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  @ApiQuery({ name: 'academicYear', required: false })
  @ApiQuery({ name: 'semester', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  async getInvoices(
    @Query('studentId') studentId?: string,
    @Query('parentId') parentId?: string,
    @Query('status') status?: InvoiceStatus,
    @Query('academicYear') academicYear?: string,
    @Query('semester') semester?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.paymentsService.findInvoices({
      studentId,
      parentId,
      status,
      academicYear,
      semester,
      limit: limit ? parseInt(limit) : undefined,
      skip: skip ? parseInt(skip) : undefined,
    });
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Lấy chi tiết hóa đơn' })
  async getInvoice(@Param('id') id: string) {
    return this.paymentsService.getInvoice(id);
  }

  @Put('invoices/:id')
  @ApiOperation({ summary: 'Cập nhật hóa đơn' })
  async updateInvoice(@Param('id') id: string, @Body() data: any) {
    return this.paymentsService.updateInvoice(id, data);
  }

  @Delete('invoices/:id')
  @ApiOperation({ summary: 'Xóa hóa đơn' })
  async deleteInvoice(@Param('id') id: string) {
    const deleted = await this.paymentsService.deleteInvoice(id);
    return { success: deleted };
  }

  // ==================== PAYMENT ENDPOINTS ====================

  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Khởi tạo thanh toán',
    description: 'Tạo payment record và lấy URL thanh toán từ gateway',
  })
  async initiatePayment(
    @Body()
    data: {
      invoiceId: string;
      method: PaymentMethod;
      bankCode?: string;
    },
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.paymentsService.initiatePayment({
      invoiceId: data.invoiceId,
      method: data.method,
      bankCode: data.bankCode,
      ipAddress,
      userAgent,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách giao dịch' })
  @ApiQuery({ name: 'invoiceId', required: false })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: PaymentStatus })
  @ApiQuery({ name: 'method', required: false, enum: PaymentMethod })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  async getPayments(
    @Query('invoiceId') invoiceId?: string,
    @Query('studentId') studentId?: string,
    @Query('parentId') parentId?: string,
    @Query('status') status?: PaymentStatus,
    @Query('method') method?: PaymentMethod,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    // Nếu có studentId, trả về bảng kê học phí tổng hợp cho màn hình "Học phí"
    if (studentId && !invoiceId) {
      const statement = await this.paymentsService.getTuitionStatement(studentId);
      return {
        success: true,
        data: statement,
      };
    }

    return this.paymentsService.findPayments({
      invoiceId,
      studentId,
      parentId,
      status,
      method,
      limit: limit ? parseInt(limit) : undefined,
      skip: skip ? parseInt(skip) : undefined,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Lấy thống kê thanh toán' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'parentId', required: false })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('studentId') studentId?: string,
    @Query('parentId') parentId?: string,
  ) {
    return this.paymentsService.getPaymentStatistics({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      studentId,
      parentId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết giao dịch' })
  async getPayment(@Param('id') id: string) {
    return this.paymentsService.getPayment(id);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hoàn tiền giao dịch' })
  async refundPayment(
    @Param('id') id: string,
    @Body() data: { reason: string },
  ) {
    return this.paymentsService.refundPayment(id, data.reason);
  }

  // ==================== WEBHOOK ENDPOINTS ====================

  @Get('vnpay/return')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'VNPay return URL',
    description: 'Endpoint xử lý callback từ VNPay sau khi thanh toán',
  })
  async handleVNPayReturn(@Query() query: any) {
    return this.paymentsService.handleVNPayReturn(query);
  }

  @Post('vnpay/ipn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'VNPay IPN',
    description: 'Endpoint nhận IPN từ VNPay',
  })
  async handleVNPayIPN(@Body() body: any) {
    const result = await this.paymentsService.handleVNPayReturn(body);

    // VNPay expects specific response format
    return {
      RspCode: result.success ? '00' : '99',
      Message: result.message,
    };
  }

  @Get('momo/return')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'MoMo return URL',
    description: 'Endpoint xử lý callback từ MoMo sau khi thanh toán',
  })
  async handleMoMoReturn(@Query() query: any) {
    // Convert query params to body format expected by MoMo
    return this.paymentsService.handleMoMoReturn(query);
  }

  @Post('momo/ipn')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'MoMo IPN',
    description: 'Endpoint nhận IPN từ MoMo',
  })
  async handleMoMoIPN(@Body() body: any) {
    const result = await this.paymentsService.handleMoMoReturn(body);

    // MoMo expects specific response format
    return {
      status: result.success ? 0 : 1,
      message: result.message,
    };
  }
}
