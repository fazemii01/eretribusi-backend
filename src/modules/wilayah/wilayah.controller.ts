import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { WilayahService } from './wilayah.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('api/wilayah')
export class WilayahController {
  constructor(private readonly wilayahService: WilayahService) {}

  @Get('master')
  async getMasterWilayah() {
    return this.wilayahService.getMasterWilayah();
  }

  @Get()
  async findAll() {
    return this.wilayahService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.KETUA, UserRole.ADMIN)
  @Post()
  async createOrUpdate(@Body() body: any) {
    return this.wilayahService.createOrUpdate(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.KETUA, UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.wilayahService.remove(Number(id));
  }
}

