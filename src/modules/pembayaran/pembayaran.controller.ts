import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { PembayaranService } from './pembayaran.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { InvoiceStatus } from '../../entities/invoice.entity';

@Controller('api/pembayaran')
export class PembayaranController {
  constructor(private readonly pembayaranService: PembayaranService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.KETUA, UserRole.ADMIN, UserRole.PETUGAS)
  @Get()
  async findAll() {
    return this.pembayaranService.findAll();
  }

  @Get('kuitansi/:idInvoice')
  async getKuitansiInfo(@Param('idInvoice') idInvoice: string) {
    return this.pembayaranService.getKuitansiInfo(idInvoice);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.KETUA, UserRole.ADMIN, UserRole.PETUGAS)
  @Post()
  async simpanPembayaran(
    @Body() body: { idInvoice: string; status: InvoiceStatus; buktiUrl?: string; admin?: string },
    @Req() req: any,
  ) {
    const adminUser = req.user?.nama_lengkap || req.user?.username || body.admin || 'Petugas DLH';
    return this.pembayaranService.simpanPembayaran({
      ...body,
      admin: body.admin || adminUser,
    });
  }
}

