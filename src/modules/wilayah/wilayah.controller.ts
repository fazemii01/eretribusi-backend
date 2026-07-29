import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { WilayahService } from './wilayah.service';

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

  @Post()
  async createOrUpdate(@Body() body: any) {
    return this.wilayahService.createOrUpdate(body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.wilayahService.remove(Number(id));
  }
}
