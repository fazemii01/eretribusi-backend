import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Pelanggan } from '../../entities/pelanggan.entity';
import { Wilayah } from '../../entities/wilayah.entity';
import { Invoice } from '../../entities/invoice.entity';
import { Pembayaran } from '../../entities/pembayaran.entity';
import { SearchService } from '../elasticsearch/search.service';

@Injectable()
export class PelangganService {
  constructor(
    @InjectRepository(Pelanggan)
    private pelangganRepo: Repository<Pelanggan>,
    @InjectRepository(Wilayah)
    private wilayahRepo: Repository<Wilayah>,
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Pembayaran)
    private pembayaranRepo: Repository<Pembayaran>,
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
      // Auto-generate ID format: {KEC}-{KEL}-{SEQ4} e.g. LMJ-JGY-0001
      const kel = await this.wilayahRepo.findOne({ where: { kelurahan: data.kelurahan } });

      const kecMap: Record<string, string> = {
        LUMAJANG: 'LMJ',
        SUKODONO: 'SKD',
        SUMBERSUKO: 'SBS',
        TEMPEH: 'TMP',
        PASIRIAN: 'PSR',
        CANDIPURO: 'CDP',
        PRONOJIWO: 'PRN',
        YOSOWILANGUN: 'YSW',
        KUNIR: 'KNR',
        TEKUNG: 'TKG',
        ROWOKANGKUNG: 'RWK',
        JATIROTO: 'JTR',
        RANDUAGUNG: 'RDG',
        KLAKAH: 'KLK',
        RANUYOSO: 'RYS',
        KEDUNGJAJANG: 'KDJ',
        PADANG: 'PDG',
        GUCIALIT: 'GCL',
        SENDURO: 'SDR',
        PASRUJAMBE: 'PRJ',
        TEMPURSARI: 'TPS',
      };

      const kecClean = (data.kecamatan || 'Lumajang').toUpperCase().trim();
      const kecCode = kecMap[kecClean] || (kecClean.length >= 3 ? kecClean.slice(0, 3) : kecClean.padEnd(3, 'X'));

      const kelRaw = (data.kelurahan || 'LMJ').toUpperCase().replace(/[^A-Z]/g, '');
      const kelCode = kel?.kode_kel
        ? kel.kode_kel.toUpperCase()
        : kelRaw.length >= 3
          ? kelRaw.slice(0, 3)
          : kelRaw.padEnd(3, 'X');

      const prefix = `${kecCode}-${kelCode}-`;
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
      idPelanggan = `${prefix}${seq.toString().padStart(4, '0')}`;
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
    await this.pembayaranRepo.delete({ id_pelanggan: id });
    await this.invoiceRepo.delete({ id_pelanggan: id });
    await this.pelangganRepo.remove(p);
    await this.searchService.deletePelangganIndex(id);
    return true;
  }

  async syncElasticsearch(): Promise<{ count: number }> {
    const all = await this.pelangganRepo.find();
    await this.searchService.bulkIndexPelanggan(all);
    return { count: all.length };
  }
}
