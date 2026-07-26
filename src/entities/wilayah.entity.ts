import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('master_wilayah')
export class Wilayah {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  kecamatan: string;

  @Column({ length: 100 })
  kelurahan: string;

  @Column({ length: 10, nullable: true })
  kode_kel: string; // e.g. JGY, JGT, RGT, CTR, TMP, KPH, DTR
}
