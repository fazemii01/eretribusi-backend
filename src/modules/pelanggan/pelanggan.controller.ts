import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { PelangganService } from './pelanggan.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('api/pelanggan')
export class PelangganController {
  constructor(private readonly pelangganService: PelangganService) {}

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('va') va?: number,
    @Query('kelurahan') kelurahan?: string,
    @Query('kecamatan') kecamatan?: string,
  ) {
    return this.pelangganService.findAll({ search, va, kelurahan, kecamatan });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.pelangganService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.KETUA, UserRole.ADMIN, UserRole.PETUGAS)
  @Post()
  async createOrUpdate(@Body() body: any) {
    return this.pelangganService.createOrUpdate(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.KETUA, UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.pelangganService.remove(id);
  }
}
