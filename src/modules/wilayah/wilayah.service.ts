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

  async createOrUpdate(data: Partial<Wilayah>): Promise<Wilayah> {
    if (data.id) {
      const existing = await this.wilayahRepo.findOneBy({ id: data.id });
      if (existing) {
        Object.assign(existing, data);
        return this.wilayahRepo.save(existing);
      }
    }
    const newWil = this.wilayahRepo.create(data);
    return this.wilayahRepo.save(newWil);
  }

  async remove(id: number): Promise<void> {
    await this.wilayahRepo.delete(id);
  }
}
