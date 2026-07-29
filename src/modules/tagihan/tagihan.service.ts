import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Invoice, InvoiceStatus } from '../../entities/invoice.entity';
import { Pelanggan } from '../../entities/pelanggan.entity';
import { Tarif } from '../../entities/tarif.entity';

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

    if (!pelanggan) {
      return { pelanggan: null, tagihan: [] };
    }

    const invoices = await this.invoiceRepo
      .createQueryBuilder('inv')
      .where('LOWER(inv.id_pelanggan) = LOWER(:id)', { id: pelanggan.id_pelanggan })
      .orderBy('inv.created_at', 'DESC')
      .getMany();

    return {
      pelanggan,
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
      await this.invoiceRepo.clear();
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
    return Array.from(yearsSet).sort().reverse();
  }

  async getDashboardStats(tahun: string = '2026') {
    const totalPelanggan = await this.pelangganRepo.count();
    const invoices = await this.invoiceRepo.find({
      where: { bulan: Like(`%${tahun}%`) },
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

  async generateTagihanMassal(bulan: string, tahun: string) {
    const pelangganList = await this.pelangganRepo.find();
    const tarifList = await this.tarifRepo.find();
    const bulanTahun = `${bulan} ${tahun}`;

    const existingInvoices = await this.invoiceRepo.find({ where: { bulan: bulanTahun } });
    const existingMap = new Set(existingInvoices.map((inv) => inv.id_pelanggan));

    const tarifMap = new Map<number, number>();
    tarifList.forEach((t) => tarifMap.set(t.va, t.nominal));

    const yearShort = tahun.slice(-2);
    const monthShort = ('0' + (new Date().getMonth() + 1)).slice(-2);

    // Queue Batching Configuration
    const CHUNK_SIZE = 100;
    const DELAY_MS = 3000;
    const toProcess = pelangganList.filter((p) => !existingMap.has(p.id_pelanggan));

    let createdCount = 0;
    const totalBatches = Math.ceil(toProcess.length / CHUNK_SIZE);

    for (let i = 0; i < toProcess.length; i += CHUNK_SIZE) {
      const chunk = toProcess.slice(i, i + CHUNK_SIZE);
      const batchNum = Math.floor(i / CHUNK_SIZE) + 1;

      const invoicesToInsert = chunk.map((p) => {
        const nominal = tarifMap.get(p.va) || 0;
        const cleanId = p.id_pelanggan.replace(/[^A-Z0-9]/gi, '');
        const idInvoice = `INV-${yearShort}${monthShort}-${cleanId}`;

        return this.invoiceRepo.create({
          id_invoice: idInvoice,
          id_pelanggan: p.id_pelanggan,
          bulan: bulanTahun,
          nominal,
          status: InvoiceStatus.BELUM_LUNAS,
          penerima: '-',
        });
      });

      await this.invoiceRepo.save(invoicesToInsert);
      createdCount += invoicesToInsert.length;

      if (batchNum < totalBatches) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    return {
      status: 'sukses',
      pesan: `Berhasil membuat ${createdCount} tagihan baru untuk ${bulanTahun} dalam ${totalBatches} batch antrean.`,
    };
  }

  // Dynamic QRIS EMVCo string payload generator (SNAP / Bank Jatim compatible mock)
  private generateDynamicQrisPayload(idInvoice: string, nominal: number): string {
    const padNominal = nominal.toString();
    return `00020101021226670016ID.GOV.DLH.LUMAJANG0118936009140000000000021552049399530336054${padNominal.length.toString().padStart(2, '0')}${padNominal}5802ID5912DLH LUMAJANG6008LUMAJANG61056731162190715${idInvoice}6304ABCD`;
  }
}
