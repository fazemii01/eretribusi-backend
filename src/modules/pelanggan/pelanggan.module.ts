import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pelanggan } from '../../entities/pelanggan.entity';
import { Wilayah } from '../../entities/wilayah.entity';
import { Invoice } from '../../entities/invoice.entity';
import { Pembayaran } from '../../entities/pembayaran.entity';
import { PelangganService } from './pelanggan.service';
import { PelangganController } from './pelanggan.controller';
import { SearchService } from '../elasticsearch/search.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pelanggan, Wilayah, Invoice, Pembayaran])],
  providers: [PelangganService, SearchService],
  controllers: [PelangganController],
  exports: [PelangganService],
})
export class PelangganModule {}
