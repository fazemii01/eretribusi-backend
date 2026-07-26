import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Pelanggan } from '../../entities/pelanggan.entity';
import { Wilayah } from '../../entities/wilayah.entity';
import { SearchService } from '../elasticsearch/search.service';

@Injectable()
export class PelangganService {
  constructor(
    @InjectRepository(Pelanggan)
    private pelangganRepo: Repository<Pelanggan>,
    @InjectRepository(Wilayah)
    private wilayahRepo: Repository<Wilayah>,
    private searchService: SearchService,
  ) {}

  async findAll(query?: { search?: string; va?: number; kelurahan?: string; kecamatan?: string }): Promise<Pelanggan[]> {
    const qb = this.pelangganRepo.createQueryBuilder('p');

    if (query?.search) {
      // Attempt Elasticsearch search first
      const esIds = await this.searchService.searchPelanggan(query.search);
      if (esIds && esIds.length > 0) {
        qb.andWhere('p.id_pelanggan IN (:...esIds)', { esIds });
      } else {
        qb.andWhere(
          '(LOWER(p.nama) LIKE LOWER(:search) OR LOWER(p.id_pelanggan) LIKE LOWER(:search) OR LOWER(p.alamat) LIKE LOWER(:search))',
          { search: `%${query.search}%` },
        );
      }
    }

    if (query?.va) {
      qb.andWhere('p.va = :va', { va: query.va });
    }

    if (query?.kelurahan) {
      qb.andWhere('p.kelurahan = :kelurahan', { kelurahan: query.kelurahan });
    }

    if (query?.kecamatan) {
      qb.andWhere('p.kecamatan = :kecamatan', { kecamatan: query.kecamatan });
    }

    qb.orderBy('p.id_pelanggan', 'ASC');
    return qb.getMany();
  }

  async findOne(id: string): Promise<Pelanggan> {
    const pelanggan = await this.pelangganRepo.findOne({ where: { id_pelanggan: id } });
    if (!pelanggan) throw new NotFoundException(`Pelanggan dengan ID ${id} tidak ditemukan`);
    return pelanggan;
  }

  async createOrUpdate(data: Partial<Pelanggan>): Promise<Pelanggan> {
    let idPelanggan = data.id_pelanggan;

    if (!idPelanggan || idPelanggan.trim() === '') {
      // Auto-generate ID: {KEL_CODE}{RW}{RT}{SEQ} e.g. JGY0101001
      const kel = await this.wilayahRepo.findOne({ where: { kelurahan: data.kelurahan } });
      const kelCode = kel?.kode_kel || 'LMJ';
      const rtPadded = (data.rt || '01').padStart(2, '0');
      const rwPadded = (data.rw || '01').padStart(2, '0');

      const prefix = `${kelCode}${rwPadded}${rtPadded}`;
      const lastRec = await this.pelangganRepo.findOne({
        where: { id_pelanggan: Like(`${prefix}%`) },
        order: { id_pelanggan: 'DESC' },
      });

      let seq = 1;
      if (lastRec) {
        const lastSeqStr = lastRec.id_pelanggan.slice(prefix.length);
        const lastSeqNum = parseInt(lastSeqStr, 10);
        if (!isNaN(lastSeqNum)) seq = lastSeqNum + 1;
      }
      idPelanggan = `${prefix}${seq.toString().padStart(3, '0')}`;
    }

    let p = await this.pelangganRepo.findOne({ where: { id_pelanggan: idPelanggan } });
    if (!p) {
      p = this.pelangganRepo.create({ ...data, id_pelanggan: idPelanggan });
    } else {
      Object.assign(p, data);
    }

    const saved = await this.pelangganRepo.save(p);
    await this.searchService.indexPelanggan(saved);
    return saved;
  }

  async remove(id: string): Promise<boolean> {
    const p = await this.findOne(id);
    await this.pelangganRepo.remove(p);
    return true;
  }
}
