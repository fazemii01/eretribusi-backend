import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('api/user')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.KETUA)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll() {
    return this.userService.findAll();
  }

  @Post()
  async createOrUpdate(
    @Body() body: { id?: string; username: string; password?: string; nama_lengkap?: string; role: UserRole },
  ) {
    return this.userService.createOrUpdate(body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
