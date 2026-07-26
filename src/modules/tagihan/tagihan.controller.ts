import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { TagihanService } from './tagihan.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('api/tagihan')
export class TagihanController {
  constructor(private readonly tagihanService: TagihanService) {}

  @Get('public/cek')
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
}
