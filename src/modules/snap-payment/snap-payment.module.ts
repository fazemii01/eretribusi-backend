import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../../entities/invoice.entity';
import { Pembayaran } from '../../entities/pembayaran.entity';
import { SnapPaymentService } from './snap-payment.service';
import { SnapPaymentController } from './snap-payment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Pembayaran])],
  providers: [SnapPaymentService],
  controllers: [SnapPaymentController],
  exports: [SnapPaymentService],
})
export class SnapPaymentModule {}
