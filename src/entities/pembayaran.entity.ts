import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('data_bayar')
export class Pembayaran {
  @PrimaryColumn({ length: 150 })
  id_kuitansi: string;

  @Column({ length: 150 })
  id_invoice: string;

  @Column({ length: 100 })
  id_pelanggan: string;

  @Column({ length: 50 })
  bulan: string;

  @Column({ type: 'int' })
  nominal: number;

  @Column({ length: 100 })
  admin: string;

  @Column({ type: 'datetime', nullable: true })
  waktu_bayar: Date;

  @Column({ length: 100, nullable: true })
  referensi_bank: string;

  @CreateDateColumn()
  created_at: Date;
}
