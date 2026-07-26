import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TarifService } from './tarif.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('api/tarif')
export class TarifController {
  constructor(private readonly tarifService: TarifService) {}

  @Get()
  async findAll() {
    return this.tarifService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.KETUA)
  @Post()
  async createOrUpdate(@Body() body: { va: number; nama_tarif?: string; nominal: number }) {
    return this.tarifService.createOrUpdate(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.KETUA)
  @Delete(':va')
  async remove(@Param('va') va: number) {
    return this.tarifService.remove(+va);
  }
}
