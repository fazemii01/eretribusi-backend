import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum InvoiceStatus {
  LUNAS = 'Lunas',
  BELUM_LUNAS = 'Belum Lunas',
}

@Entity('data_invoice')
export class Invoice {
  @PrimaryColumn({ length: 150 })
  id_invoice: string;

  @Column({ length: 100 })
  @Index()
  id_pelanggan: string;

  @Column({ length: 50 })
  @Index()
  bulan: string;

  @Column({ type: 'int' })
  nominal: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.BELUM_LUNAS,
  })
  @Index()
  status: InvoiceStatus;

  @Column({ type: 'longtext', nullable: true })
  bukti_url: string;

  @Column({ length: 100, default: '-' })
  penerima: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
