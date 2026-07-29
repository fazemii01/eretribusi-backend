import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('data_pelanggan')
export class Pelanggan {
  @PrimaryColumn({ length: 100 })
  id_pelanggan: string;

  @Column({ length: 255 })
  nama: string;

  @Column({ type: 'text' })
  alamat: string;

  @Column({ length: 50, nullable: true })
  rt: string;

  @Column({ length: 50, nullable: true })
  rw: string;

  @Column({ length: 100 })
  kelurahan: string;

  @Column({ length: 100 })
  kecamatan: string;

  @Column({ type: 'int' })
  va: number; // electrical capacity in VA

  @Column({ length: 50, default: '-' })
  no_hp: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
