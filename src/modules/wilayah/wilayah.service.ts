import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wilayah } from '../../entities/wilayah.entity';

@Injectable()
export class WilayahService {
  constructor(
    @InjectRepository(Wilayah)
    private wilayahRepo: Repository<Wilayah>,
  ) {}

  async getMasterWilayah(): Promise<Record<string, string[]>> {
    const list = await this.wilayahRepo.find({ order: { kecamatan: 'ASC', kelurahan: 'ASC' } });
    const res: Record<string, string[]> = {};
    list.forEach((w) => {
      if (!res[w.kecamatan]) res[w.kecamatan] = [];
      res[w.kecamatan].push(w.kelurahan);
    });
    return res;
  }

  async findAll(): Promise<Wilayah[]> {
    return this.wilayahRepo.find({ order: { kecamatan: 'ASC', kelurahan: 'ASC' } });
  }
}
