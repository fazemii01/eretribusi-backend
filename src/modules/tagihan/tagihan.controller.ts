import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { TagihanService } from './tagihan.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../entities/user.entity';

import { TagihanCronService } from './tagihan-cron.service';

@Controller('api/tagihan')
export class TagihanController {
  constructor(
    private readonly tagihanService: TagihanService,
    private readonly tagihanCronService: TagihanCronService,
  ) {}

  @Get('stats')
  async getDashboardStats(@Query('tahun') tahun: string) {
    return this.tagihanService.getDashboardStats(tahun);
  }

  @Get(['public', 'public/cek'])
  async publicCekTagihan(@Query('id') id: string) {
    return this.tagihanService.findPublicBill(id);
  }

  @Get('public/years')
  async getUniqueYears() {
    return this.tagihanService.getUniqueYears();
  }

  @Get('year/:tahun')
  async findByYear(@Param('tahun') tahun: string) {
    return this.tagihanService.findByYear(tahun);
  }

  @Get('history/:idPelanggan')
  async getHistoryTagihan(@Param('idPelanggan') idPelanggan: string) {
    return this.tagihanService.getHistoryTagihan(idPelanggan);
  }

  @Get()
  async findAll() {
    return this.tagihanService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.KETUA, UserRole.ADMIN)
  @Post('generate-massal')
  async generateTagihanMassal(@Body() body: { bulan: string; tahun: string }) {
    return this.tagihanService.generateTagihanMassal(body.bulan, body.tahun);
  }

  @Post('trigger-cron')
  async triggerCronManually(@Query('force') force?: string) {
    const isForce = force === 'true' || force === '1';
    return this.tagihanCronService.checkAndGenerateMonthlyInvoices(isForce);
  }
}
