import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pembayaran } from '../../entities/pembayaran.entity';
import { Invoice, InvoiceStatus } from '../../entities/invoice.entity';

@Injectable()
export class PembayaranService {
  constructor(
    @InjectRepository(Pembayaran)
    private pembayaranRepo: Repository<Pembayaran>,
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
  ) {}

  async simpanPembayaran(data: {
    idInvoice: string;
    status: InvoiceStatus;
    buktiUrl?: string;
    admin: string;
  }) {
    const inv = await this.invoiceRepo.findOne({ where: { id_invoice: data.idInvoice } });
    if (!inv) throw new NotFoundException('Invoice tidak ditemukan');

    const statusLama = inv.status;
    inv.status = data.status;
    if (data.buktiUrl) inv.bukti_url = data.buktiUrl;
    inv.penerima = data.status === InvoiceStatus.LUNAS ? data.admin : '-';

    await this.invoiceRepo.save(inv);

    const idKuitansi = `PAY-${data.idInvoice}`;

    if (data.status === InvoiceStatus.LUNAS && statusLama !== InvoiceStatus.LUNAS) {
      let bayar = await this.pembayaranRepo.findOne({ where: { id_kuitansi: idKuitansi } });
      if (!bayar) {
        bayar = this.pembayaranRepo.create({
          id_kuitansi: idKuitansi,
          id_invoice: inv.id_invoice,
          id_pelanggan: inv.id_pelanggan,
          bulan: inv.bulan,
          nominal: inv.nominal,
          admin: data.admin,
        });
      } else {
        bayar.admin = data.admin;
      }
      await this.pembayaranRepo.save(bayar);
    } else if (data.status === InvoiceStatus.BELUM_LUNAS && statusLama === InvoiceStatus.LUNAS) {
      await this.pembayaranRepo.delete({ id_kuitansi: idKuitansi });
    }

    return inv;
  }

  async getKuitansiInfo(idInvoice: string) {
    const idKuitansi = `PAY-${idInvoice}`;
    const bayar = await this.pembayaranRepo.findOne({ where: { id_kuitansi: idKuitansi } });
    if (bayar) return bayar;

    // Fallback if invoice is marked lunas directly
    const inv = await this.invoiceRepo.findOne({ where: { id_invoice: idInvoice } });
    if (!inv || inv.status !== InvoiceStatus.LUNAS) return null;

    return {
      id_kuitansi: idKuitansi,
      id_invoice: inv.id_invoice,
      id_pelanggan: inv.id_pelanggan,
      bulan: inv.bulan,
      nominal: inv.nominal,
      admin: inv.penerima,
      created_at: inv.created_at,
    };
  }
}
