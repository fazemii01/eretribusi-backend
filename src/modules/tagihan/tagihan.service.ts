import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Invoice, InvoiceStatus } from '../../entities/invoice.entity';
import { Pelanggan } from '../../entities/pelanggan.entity';
import { Tarif } from '../../entities/tarif.entity';
import { buildDynamicQrisString } from '../../common/qris-utils';


@Injectable()
export class TagihanService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Pelanggan)
    private pelangganRepo: Repository<Pelanggan>,
    @InjectRepository(Tarif)
    private tarifRepo: Repository<Tarif>,
  ) {}

  async findPublicBill(idInput: string) {
    const cleanId = (idInput || '').trim();
    if (!cleanId) return { pelanggan: null, tagihan: [] };

    let pelanggan = await this.pelangganRepo.findOne({ where: { id_pelanggan: cleanId } });
    if (!pelanggan) {
      pelanggan = await this.pelangganRepo.findOne({ where: { id_pelanggan: cleanId.toUpperCase() } });
    }
    if (!pelanggan) {
      pelanggan = await this.pelangganRepo
        .createQueryBuilder('p')
        .where('LOWER(p.id_pelanggan) = LOWER(:id)', { id: cleanId })
        .getOne();
    }

    // If still not found, check if cleanId is an Invoice ID (e.g. scanned from receipt QR code)
    let matchedInvoiceId: string | null = null;
    if (!pelanggan) {
      const invMatch = await this.invoiceRepo
        .createQueryBuilder('inv')
        .where('LOWER(inv.id_invoice) = LOWER(:id)', { id: cleanId })
        .getOne();

      if (invMatch) {
        matchedInvoiceId = invMatch.id_invoice;
        pelanggan = await this.pelangganRepo.findOne({ where: { id_pelanggan: invMatch.id_pelanggan } });
      }
    }

    if (!pelanggan) {
      return { pelanggan: null, tagihan: [], matched_invoice: null };
    }


    const invoices = await this.invoiceRepo
      .createQueryBuilder('inv')
      .where('LOWER(inv.id_pelanggan) = LOWER(:id)', { id: pelanggan.id_pelanggan })
      .orderBy('inv.created_at', 'DESC')
      .getMany();

    return {
      pelanggan,
      matched_invoice: matchedInvoiceId,
      tagihan: invoices.map((inv) => ({
        invoice: inv.id_invoice,
        bulan: inv.bulan,
        nominal: inv.nominal,
        status: inv.status,
        qris_payload: this.generateDynamicQrisPayload(inv.id_invoice, inv.nominal),
      })),
    };

  }

  async getHistoryTagihan(idPelanggan: string) {
    return this.invoiceRepo.find({
      where: { id_pelanggan: idPelanggan.toUpperCase() },
      order: { created_at: 'DESC' },
    });
  }

  async findByYear(tahun: string) {
    return this.invoiceRepo.find({
      where: { bulan: Like(`%${tahun}%`) },
      order: { created_at: 'DESC' },
    });
  }

  async findAll() {
    const pelangganList = await this.pelangganRepo.find();
    if (pelangganList.length === 0) {
      return [];
    }


    // Use uppercase keys for case-insensitive matching
    const pelangganMap = new Map<string, Pelanggan>();
    pelangganList.forEach((p) => pelangganMap.set(p.id_pelanggan.toUpperCase(), p));

    const invoices = await this.invoiceRepo.find({ order: { created_at: 'DESC' } });

    // Filter out orphaned invoices and populate pelanggan data
    return invoices
      .filter((inv) => pelangganMap.has((inv.id_pelanggan || '').toUpperCase()))
      .map((inv) => {
        const p = pelangganMap.get((inv.id_pelanggan || '').toUpperCase());
        return {
          ...inv,
          // Root-level fields for direct access by frontend
          nama: p ? p.nama : inv.id_pelanggan,
          alamat: p ? p.alamat : '-',
          // Nested pelanggan object for backward compatibility
          pelanggan: p
            ? {
                nama: p.nama,
                alamat: p.alamat,
                rt: p.rt,
                rw: p.rw,
                kelurahan: p.kelurahan,
                kecamatan: p.kecamatan,
                va: p.va,
              }
            : null,
        };
      });
  }

  async getUniqueYears(): Promise<string[]> {
    const invoices = await this.invoiceRepo.find({ select: { bulan: true } });
    const yearsSet = new Set<string>();
    invoices.forEach((inv) => {
      const parts = inv.bulan.trim().split(' ');
      if (parts.length > 1) {
        const yr = parts[parts.length - 1];
        if (/^\d{4}$/.test(yr)) yearsSet.add(yr);
      }
    });
    const currentYr = new Date().getFullYear().toString();
    yearsSet.add(currentYr);
    return Array.from(yearsSet).sort().reverse();
  }

  async getDashboardStats(tahun?: string) {
    const targetYear = tahun || new Date().getFullYear().toString();
    const totalPelanggan = await this.pelangganRepo.count();
    const invoices = await this.invoiceRepo.find({
      where: { bulan: Like(`%${targetYear}%`) },
    });

    let totalLunas = 0;
    let totalTunggakan = 0;
    let paidInvoicesCount = 0;

    const monthlyStats: Record<string, { lunas: number; tunggakan: number }> = {
      Jan: { lunas: 0, tunggakan: 0 },
      Feb: { lunas: 0, tunggakan: 0 },
      Mar: { lunas: 0, tunggakan: 0 },
      Apr: { lunas: 0, tunggakan: 0 },
      Mei: { lunas: 0, tunggakan: 0 },
      Jun: { lunas: 0, tunggakan: 0 },
      Jul: { lunas: 0, tunggakan: 0 },
      Agu: { lunas: 0, tunggakan: 0 },
      Sep: { lunas: 0, tunggakan: 0 },
      Okt: { lunas: 0, tunggakan: 0 },
      Nov: { lunas: 0, tunggakan: 0 },
      Des: { lunas: 0, tunggakan: 0 },
    };

    invoices.forEach((inv) => {
      const b = inv.bulan.toLowerCase();
      let key = 'Jan';
      if (b.includes('jan')) key = 'Jan';
      else if (b.includes('feb')) key = 'Feb';
      else if (b.includes('mar')) key = 'Mar';
      else if (b.includes('apr')) key = 'Apr';
      else if (b.includes('mei')) key = 'Mei';
      else if (b.includes('jun')) key = 'Jun';
      else if (b.includes('jul')) key = 'Jul';
      else if (b.includes('agu')) key = 'Agu';
      else if (b.includes('sep')) key = 'Sep';
      else if (b.includes('okt')) key = 'Okt';
      else if (b.includes('nov')) key = 'Nov';
      else if (b.includes('des')) key = 'Des';

      if (inv.status === InvoiceStatus.LUNAS) {
        totalLunas += Number(inv.nominal);
        paidInvoicesCount++;
        if (monthlyStats[key]) monthlyStats[key].lunas += Number(inv.nominal);
      } else {
        totalTunggakan += Number(inv.nominal);
        if (monthlyStats[key]) monthlyStats[key].tunggakan += Number(inv.nominal);
      }
    });

    const kepatuhan = invoices.length > 0 ? Math.round((paidInvoicesCount / invoices.length) * 100) : 0;

    const chartData = Object.entries(monthlyStats).map(([bulan, data]) => ({
      bulan,
      lunas: data.lunas,
      tunggakan: data.tunggakan,
    }));

    const recentInvoices = await this.invoiceRepo.find({
      where: { status: InvoiceStatus.LUNAS },
      order: { updated_at: 'DESC' },
      take: 5,
    });

    const recentPayments = await Promise.all(
      recentInvoices.map(async (inv) => {
        const p = await this.pelangganRepo.findOne({ where: { id_pelanggan: inv.id_pelanggan } });
        return {
          waktu: new Date(inv.updated_at || inv.created_at || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          nama: p ? p.nama : inv.id_pelanggan,
          bulan: inv.bulan,
          nominal: inv.nominal,
          admin: inv.penerima || 'Petugas DLH',
        };
      })
    );

    return {
      totalLunas,
      totalTunggakan,
      totalPelanggan,
      kepatuhan,
      chartData,
      recentPayments,
    };
  }

  getMonthCode(bulanStr: string): string {
    if (!bulanStr) return ('0' + (new Date().getMonth() + 1)).slice(-2);
    const b = bulanStr.toLowerCase().trim();

    if (b.includes('jan')) return '01';
    if (b.includes('feb')) return '02';
    if (b.includes('mar')) return '03';
    if (b.includes('apr')) return '04';
    if (b.includes('mei')) return '05';
    if (b.includes('jun')) return '06';
    if (b.includes('jul')) return '07';
    if (b.includes('agu') || b.includes('ags')) return '08';
    if (b.includes('sep')) return '09';
    if (b.includes('okt')) return '10';
    if (b.includes('nov')) return '11';
    if (b.includes('des')) return '12';

    const num = parseInt(b, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) {
      return ('0' + num).slice(-2);
    }

    return ('0' + (new Date().getMonth() + 1)).slice(-2);
  }

  async generateTagihanMassal(bulan: string, tahun: string) {
    const pelangganList = await this.pelangganRepo.find();
    const tarifList = await this.tarifRepo.find();
    const bulanTahun = `${bulan} ${tahun}`;

    // Fetch all existing invoices to verify existing billing periods and primary keys
    const allInvoices = await this.invoiceRepo.find();
    const existingCustomerIds = new Set<string>();
    const existingIdMap = new Set<string>();

    allInvoices.forEach((inv) => {
      existingIdMap.add(inv.id_invoice.toUpperCase());
      if (inv.bulan && inv.bulan.toLowerCase().trim() === bulanTahun.toLowerCase().trim()) {
        existingCustomerIds.add(inv.id_pelanggan.toUpperCase());
      }
    });

    const tarifMap = new Map<number, number>();
    tarifList.forEach((t) => tarifMap.set(t.va, t.nominal));

    const yearShort = tahun.trim().slice(-2);
    const monthShort = this.getMonthCode(bulan);

    // Queue Batching Configuration
    const CHUNK_SIZE = 100;
    const DELAY_MS = 3000;
    const toProcess = pelangganList.filter(
      (p) => !existingCustomerIds.has(p.id_pelanggan.toUpperCase()),
    );
    const skippedCount = pelangganList.length - toProcess.length;

    let createdCount = 0;
    const totalBatches = Math.ceil(toProcess.length / CHUNK_SIZE);

    for (let i = 0; i < toProcess.length; i += CHUNK_SIZE) {
      const chunk = toProcess.slice(i, i + CHUNK_SIZE);
      const batchNum = Math.floor(i / CHUNK_SIZE) + 1;

      const invoicesToInsert = chunk.map((p) => {
        const nominal = tarifMap.get(p.va) || 0;
        const cleanId = p.id_pelanggan.replace(/[^A-Z0-9]/gi, '');
        let idInvoice = `INV-${yearShort}${monthShort}-${cleanId}`;

        // Ensure unique primary key even if collision occurs
        let seq = 1;
        while (existingIdMap.has(idInvoice.toUpperCase())) {
          idInvoice = `INV-${yearShort}${monthShort}-${cleanId}-${seq}`;
          seq++;
        }
        existingIdMap.add(idInvoice.toUpperCase());

        return this.invoiceRepo.create({
          id_invoice: idInvoice,
          id_pelanggan: p.id_pelanggan,
          bulan: bulanTahun,
          nominal,
          status: InvoiceStatus.BELUM_LUNAS,
          penerima: '-',
        });
      });

      if (invoicesToInsert.length > 0) {
        await this.invoiceRepo.save(invoicesToInsert);
        createdCount += invoicesToInsert.length;
      }

      if (batchNum < totalBatches) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    let message = '';
    if (createdCount > 0 && skippedCount > 0) {
      message = `Berhasil menerbitkan ${createdCount} tagihan baru untuk ${bulanTahun}. (${skippedCount} pelanggan sudah memiliki tagihan untuk periode ini dan dilewati).`;
    } else if (createdCount > 0) {
      message = `Berhasil menerbitkan ${createdCount} tagihan baru untuk ${bulanTahun}.`;
    } else if (skippedCount > 0) {
      message = `Seluruh ${skippedCount} pelanggan sudah memiliki tagihan untuk periode ${bulanTahun}. Tidak ada tagihan baru yang dibuat.`;
    } else {
      message = `Tidak ada pelanggan yang ditemukan untuk diproses.`;
    }

    return {
      status: 'sukses',
      createdCount,
      skippedCount,
      pesan: message,
      message,
    };
  }

  // Dynamic QRIS EMVCo string payload generator (SNAP / Bank Jatim compatible)
  generateDynamicQrisPayload(idInvoice: string, nominal: number): string {
    return buildDynamicQrisString(idInvoice, nominal);
  }
}

