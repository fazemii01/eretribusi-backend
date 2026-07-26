import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('data_pelanggan')
export class Pelanggan {
  @PrimaryColumn({ length: 20 })
  id_pelanggan: string; // e.g. JGY0101001

  @Column({ length: 150 })
  nama: string;

  @Column({ type: 'text' })
  alamat: string;

  @Column({ length: 10, nullable: true })
  rt: string;

  @Column({ length: 10, nullable: true })
  rw: string;

  @Column({ length: 100 })
  kelurahan: string;

  @Column({ length: 100 })
  kecamatan: string;

  @Column({ type: 'int' })
  va: number; // electrical capacity in VA (FK to Tarif)

  @Column({ length: 20, default: '-' })
  no_hp: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
