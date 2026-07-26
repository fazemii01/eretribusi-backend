import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async findAll(): Promise<Omit<User, 'password'>[]> {
    const users = await this.userRepo.find({ order: { created_at: 'ASC' } });
    return users.map(({ password, ...rest }) => rest);
  }

  async createOrUpdate(data: {
    id?: string;
    username: string;
    password?: string;
    nama_lengkap?: string;
    role: UserRole;
  }) {
    let u: User | null = null;
    if (data.id) {
      u = await this.userRepo.findOne({ where: { id: data.id } });
      if (!u) throw new NotFoundException('User tidak ditemukan');
      u.username = data.username;
      u.role = data.role;
      if (data.nama_lengkap) u.nama_lengkap = data.nama_lengkap;
      if (data.password && data.password.trim() !== '') {
        u.password = await bcrypt.hash(data.password, 10);
      }
    } else {
      const hashedPassword = await bcrypt.hash(data.password || '123456', 10);
      u = this.userRepo.create({
        username: data.username,
        password: hashedPassword,
        nama_lengkap: data.nama_lengkap || 'Pengurus DLH',
        role: data.role,
      });
    }

    const saved = await this.userRepo.save(u);
    const { password, ...result } = saved;
    return result;
  }

  async remove(id: string): Promise<boolean> {
    const u = await this.userRepo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('User tidak ditemukan');
    await this.userRepo.remove(u);
    return true;
  }
}
