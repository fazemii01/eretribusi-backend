import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('master_tarif')
export class Tarif {
  @PrimaryColumn({ type: 'int' })
  va: number; // Electrical capacity in VA (e.g. 450, 900, 1300)

  @Column({ length: 100, default: 'Tarif Retribusi' })
  nama_tarif: string;

  @Column({ type: 'int' })
  nominal: number; // Rate in IDR
}
