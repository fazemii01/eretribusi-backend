import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PengaturanService } from './pengaturan.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { Pengaturan } from '../../entities/pengaturan.entity';

@Controller('api/pengaturan')
export class PengaturanController {
  constructor(private readonly pengaturanService: PengaturanService) {}

  @Get()
  async getPengaturan() {
    return this.pengaturanService.getPengaturan();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.KETUA, UserRole.ADMIN)
  @Post()
  async simpanPengaturan(@Body() body: Partial<Pengaturan>) {
    return this.pengaturanService.simpanPengaturan(body);
  }
}
