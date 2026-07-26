import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pelanggan } from '../../entities/pelanggan.entity';
import { Wilayah } from '../../entities/wilayah.entity';
import { PelangganService } from './pelanggan.service';
import { PelangganController } from './pelanggan.controller';
import { SearchService } from '../elasticsearch/search.service';

@Module({
  imports: [TypeOrmModule.forFeature([Pelanggan, Wilayah])],
  providers: [PelangganService, SearchService],
  controllers: [PelangganController],
  exports: [PelangganService],
})
export class PelangganModule {}
