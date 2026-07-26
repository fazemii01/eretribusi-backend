import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      throw new UnauthorizedException('Username atau password salah');
    }

    let isMatch = false;
    if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
      isMatch = await bcrypt.compare(pass, user.password);
    } else {
      // Legacy SHA-256 fallback check
      const legacyHash = crypto.createHash('sha256').update(pass).digest('hex');
      if (legacyHash === user.password) {
        isMatch = true;
        // Upgrade hash to bcrypt
        user.password = await bcrypt.hash(pass, 10);
        await this.userRepository.save(user);
      }
    }

    if (!isMatch) {
      throw new UnauthorizedException('Username atau password salah');
    }
    return user;
  }

  async login(user: User) {
    const payload = { username: user.username, sub: user.id, role: user.role, nama_lengkap: user.nama_lengkap };
    return {
      berhasil: true,
      uuid: user.id,
      username: user.username,
      nama_lengkap: user.nama_lengkap,
      role: user.role,
      token: this.jwtService.sign(payload),
    };
  }
}
