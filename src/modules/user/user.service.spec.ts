import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { User, UserRole } from '../../entities/user.entity';

describe('UserService', () => {
  let service: UserService;
  let mockUserRepo: any;

  beforeEach(async () => {
    mockUserRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((u) => Promise.resolve({ id: 'uuid-1', ...u })),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('findAll', () => {
    it('should return user list without passwords', async () => {
      const mockUsers = [
        { id: '1', username: 'admin', password: 'hashedpassword', role: UserRole.ADMIN },
      ];
      mockUserRepo.find.mockResolvedValue(mockUsers);

      const res = await service.findAll();
      expect(res[0]).not.toHaveProperty('password');
      expect(res[0].username).toBe('admin');
    });
  });

  describe('createOrUpdate', () => {
    it('should hash password and create new user when id is not provided', async () => {
      const res = await service.createOrUpdate({
        username: 'petugas1',
        password: 'secretpassword',
        role: UserRole.PETUGAS,
      });

      expect(res.username).toBe('petugas1');
      expect(res).not.toHaveProperty('password');
      expect(mockUserRepo.create).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('unknown-id')).rejects.toThrow(NotFoundException);
    });
  });
});
