import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tarif } from '../../entities/tarif.entity';

@Injectable()
export class TarifService {
  constructor(
    @InjectRepository(Tarif)
    private tarifRepo: Repository<Tarif>,
  ) {}

  async findAll(): Promise<Tarif[]> {
    return this.tarifRepo.find({ order: { va: 'ASC' } });
  }

  async createOrUpdate(data: { va: number; nama_tarif?: string; nominal: number }): Promise<Tarif> {
    let t = await this.tarifRepo.findOne({ where: { va: data.va } });
    if (!t) {
      t = this.tarifRepo.create(data);
    } else {
      t.nominal = data.nominal;
      if (data.nama_tarif) t.nama_tarif = data.nama_tarif;
    }
    return this.tarifRepo.save(t);
  }

  async remove(va: number): Promise<boolean> {
    const t = await this.tarifRepo.findOne({ where: { va } });
    if (!t) throw new NotFoundException(`Tarif VA ${va} tidak ditemukan`);
    await this.tarifRepo.remove(t);
    return true;
  }
}
