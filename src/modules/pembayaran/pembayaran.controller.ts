import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { PembayaranService } from './pembayaran.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { InvoiceStatus } from '../../entities/invoice.entity';

@Controller('api/pembayaran')
export class PembayaranController {
  constructor(private readonly pembayaranService: PembayaranService) {}

  @Get('kuitansi/:idInvoice')
  async getKuitansiInfo(@Param('idInvoice') idInvoice: string) {
    return this.pembayaranService.getKuitansiInfo(idInvoice);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.KETUA, UserRole.ADMIN, UserRole.PETUGAS)
  @Post()
  async simpanPembayaran(
    @Body() body: { idInvoice: string; status: InvoiceStatus; buktiUrl?: string; admin: string },
  ) {
    return this.pembayaranService.simpanPembayaran(body);
  }
}
