import { Controller, Get } from '@nestjs/common';
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
}
