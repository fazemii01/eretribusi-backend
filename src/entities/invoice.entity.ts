import { Entity, Column, PrimaryColumn, CreateDateColumn, Index } from 'typeorm';

export enum InvoiceStatus {
  LUNAS = 'Lunas',
  BELUM_LUNAS = 'Belum Lunas',
}

@Entity('data_invoice')
export class Invoice {
  @PrimaryColumn({ length: 50 })
  id_invoice: string; // e.g. INV-2603-JGY0101001

  @Column({ length: 20 })
  @Index()
  id_pelanggan: string;

  @Column({ length: 50 })
  @Index()
  bulan: string; // e.g. "Maret 2026"

  @Column({ type: 'int' })
  nominal: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.BELUM_LUNAS,
  })
  @Index()
  status: InvoiceStatus;

  @Column({ type: 'text', nullable: true })
  bukti_url: string;

  @Column({ length: 100, default: '-' })
  penerima: string;

  @CreateDateColumn()
  created_at: Date;
}
