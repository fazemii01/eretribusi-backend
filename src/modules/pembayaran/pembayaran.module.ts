import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pembayaran } from '../../entities/pembayaran.entity';
import { Invoice } from '../../entities/invoice.entity';
import { PembayaranService } from './pembayaran.service';
import { PembayaranController } from './pembayaran.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Pembayaran, Invoice])],
  providers: [PembayaranService],
  controllers: [PembayaranController],
  exports: [PembayaranService],
})
export class PembayaranModule {}
