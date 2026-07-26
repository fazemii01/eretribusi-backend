import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pengaturan } from '../../entities/pengaturan.entity';

@Injectable()
export class PengaturanService {
  constructor(
    @InjectRepository(Pengaturan)
    private pengaturanRepo: Repository<Pengaturan>,
  ) {}

  async getPengaturan(): Promise<Pengaturan> {
    let p = await this.pengaturanRepo.findOne({ where: { id: 1 } });
    if (!p) {
      p = this.pengaturanRepo.create({
        id: 1,
        no_rekening: 'BANK JATIM - 1061001847',
        atas_nama: 'Bendahara Penerimaan DLH',
        link_qris: '',
        no_wa_admin: '6281234567890',
      });
      await this.pengaturanRepo.save(p);
    }
    return p;
  }

  async simpanPengaturan(data: Partial<Pengaturan>): Promise<Pengaturan> {
    let p = await this.getPengaturan();
    Object.assign(p, data);
    return this.pengaturanRepo.save(p);
  }
}
