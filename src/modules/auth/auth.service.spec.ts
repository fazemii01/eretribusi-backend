import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { User, UserRole } from '../../entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockUserRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(service.validateUser('unknown', 'pass')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should validate user with bcrypt password hash successfully', async () => {
      const hashedPassword = await bcrypt.hash('secret123', 10);
      const mockUser = {
        id: 1,
        username: 'admin',
        password: hashedPassword,
        role: UserRole.ADMIN,
      } as User;

      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const user = await service.validateUser('admin', 'secret123');
      expect(user.username).toBe('admin');
    });

    it('should throw UnauthorizedException on password mismatch', async () => {
      const hashedPassword = await bcrypt.hash('secret123', 10);
      const mockUser = {
        id: 1,
        username: 'admin',
        password: hashedPassword,
      } as User;

      mockUserRepo.findOne.mockResolvedValue(mockUser);

      await expect(service.validateUser('admin', 'wrongpass')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('login', () => {
    it('should return login payload with signed JWT token', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        nama_lengkap: 'Super Admin',
        role: UserRole.ADMIN,
      } as User;

      const res = await service.login(mockUser);
      expect(res.berhasil).toBe(true);
      expect(res.username).toBe('admin');
      expect(res.token).toBe('mock-jwt-token');
      expect(mockJwtService.sign).toHaveBeenCalled();
    });
  });
});
