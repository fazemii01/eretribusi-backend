import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wilayah } from '../../entities/wilayah.entity';
import { WilayahService } from './wilayah.service';
import { WilayahController } from './wilayah.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Wilayah])],
  providers: [WilayahService],
  controllers: [WilayahController],
  exports: [WilayahService],
})
export class WilayahModule {}
