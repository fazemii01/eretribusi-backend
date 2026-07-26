import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pengaturan } from '../../entities/pengaturan.entity';
import { PengaturanService } from './pengaturan.service';
import { PengaturanController } from './pengaturan.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Pengaturan])],
  providers: [PengaturanService],
  controllers: [PengaturanController],
  exports: [PengaturanService],
})
export class PengaturanModule {}
