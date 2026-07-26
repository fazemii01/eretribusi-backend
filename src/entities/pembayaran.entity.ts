import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

@Entity('data_bayar')
export class Pembayaran {
  @PrimaryColumn({ length: 60 })
  id_kuitansi: string; // e.g. PAY-INV-2603-JGY0101001

  @Column({ length: 50 })
  id_invoice: string;

  @Column({ length: 20 })
  id_pelanggan: string;

  @Column({ length: 50 })
  bulan: string;

  @Column({ type: 'int' })
  nominal: number;

  @Column({ length: 100 })
  admin: string;

  @CreateDateColumn()
  created_at: Date;
}
