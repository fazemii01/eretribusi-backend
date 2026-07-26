import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('data_pengaturan')
export class Pengaturan {
  @PrimaryColumn({ type: 'int', default: 1 })
  id: number;

  @Column({ length: 150, default: 'BANK JATIM - 1061001847' })
  no_rekening: string;

  @Column({ length: 150, default: 'Bendahara Penerimaan DLH' })
  atas_nama: string;

  @Column({ type: 'text', nullable: true })
  link_qris: string;

  @Column({ length: 20, default: '6281234567890' })
  no_wa_admin: string;
}
