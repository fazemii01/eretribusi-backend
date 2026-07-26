import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../../entities/invoice.entity';
import { Pelanggan } from '../../entities/pelanggan.entity';
import { Tarif } from '../../entities/tarif.entity';
import { TagihanService } from './tagihan.service';
import { TagihanCronService } from './tagihan-cron.service';
import { TagihanController } from './tagihan.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Pelanggan, Tarif])],
  providers: [TagihanService, TagihanCronService],
  controllers: [TagihanController],
  exports: [TagihanService, TagihanCronService],
})
export class TagihanModule {}
