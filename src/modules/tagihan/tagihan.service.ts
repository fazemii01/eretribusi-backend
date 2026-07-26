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
    const invoices = await this.invoiceRepo.find({
      where: { id_pelanggan: idInput.toUpperCase() },
      order: { created_at: 'DESC' },
    });
    const pelanggan = await this.pelangganRepo.findOne({ where: { id_pelanggan: idInput.toUpperCase() } });

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
    return this.invoiceRepo.find({ order: { created_at: 'DESC' } });
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

  async generateTagihanMassal(bulan: string, tahun: string) {
    const pelangganList = await this.pelangganRepo.find();
    const tarifList = await this.tarifRepo.find();
    const bulanTahun = `${bulan} ${tahun}`;

    const existingInvoices = await this.invoiceRepo.find({ where: { bulan: bulanTahun } });
    const existingMap = new Set(existingInvoices.map((inv) => inv.id_pelanggan));

    const tarifMap = new Map<number, number>();
    tarifList.forEach((t) => tarifMap.set(t.va, t.nominal));

    let createdCount = 0;
    const yearShort = tahun.slice(-2);
    const monthShort = ('0' + (new Date().getMonth() + 1)).slice(-2);

    for (const p of pelangganList) {
      if (!existingMap.has(p.id_pelanggan)) {
        const nominal = tarifMap.get(p.va) || 0;
        const cleanId = p.id_pelanggan.replace(/[^A-Z0-9]/gi, '');
        const idInvoice = `INV-${yearShort}${monthShort}-${cleanId}`;

        const inv = this.invoiceRepo.create({
          id_invoice: idInvoice,
          id_pelanggan: p.id_pelanggan,
          bulan: bulanTahun,
          nominal,
          status: InvoiceStatus.BELUM_LUNAS,
          penerima: '-',
        });
        await this.invoiceRepo.save(inv);
        createdCount++;
      }
    }

    return {
      status: 'sukses',
      pesan: `Berhasil membuat ${createdCount} tagihan baru untuk ${bulanTahun}.`,
    };
  }

  // Dynamic QRIS EMVCo string payload generator (SNAP / Bank Jatim compatible mock)
  private generateDynamicQrisPayload(idInvoice: string, nominal: number): string {
    const padNominal = nominal.toString();
    return `00020101021226670016ID.GOV.DLH.LUMAJANG0118936009140000000000021552049399530336054${padNominal.length.toString().padStart(2, '0')}${padNominal}5802ID5912DLH LUMAJANG6008LUMAJANG61056731162190715${idInvoice}6304ABCD`;
  }
}
