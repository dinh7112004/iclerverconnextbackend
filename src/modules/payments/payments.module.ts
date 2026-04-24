import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { Payment, PaymentSchema } from './entities/payment.entity';
import { Invoice, InvoiceSchema } from './entities/invoice.entity';
import { VNPayGateway } from './gateways/vnpay.gateway';
import { MoMoGateway } from './gateways/momo.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from '../students/entities/student.entity';
import { Class } from '../classes/entities/class.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
    TypeOrmModule.forFeature([Student, Class]),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, VNPayGateway, MoMoGateway],
  exports: [PaymentsService],
})
export class PaymentsModule { }
