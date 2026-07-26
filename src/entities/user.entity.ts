import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum UserRole {
  KETUA = 'ketua',
  ADMIN = 'admin',
  PETUGAS = 'petugas',
}

@Entity('data_admin')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  username: string;

  @Column({ length: 255 })
  password: string; // bcrypt hash

  @Column({ length: 150, default: 'Pengurus DLH' })
  nama_lengkap: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.ADMIN,
  })
  role: UserRole;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
