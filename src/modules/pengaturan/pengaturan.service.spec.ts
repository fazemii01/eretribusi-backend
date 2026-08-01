import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PengaturanService } from './pengaturan.service';
import { Pengaturan } from '../../entities/pengaturan.entity';

describe('PengaturanService', () => {
  let service: PengaturanService;
  let mockPengaturanRepo: any;

  beforeEach(async () => {
    mockPengaturanRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PengaturanService,
        { provide: getRepositoryToken(Pengaturan), useValue: mockPengaturanRepo },
      ],
    }).compile();

    service = module.get<PengaturanService>(PengaturanService);
  });

  describe('getPengaturan', () => {
    it('should create default settings if not existing', async () => {
      mockPengaturanRepo.findOne.mockResolvedValue(null);
      const res = await service.getPengaturan();
      expect(res.id).toBe(1);
      expect(res.atas_nama).toBe('Bendahara Penerimaan DLH');
      expect(mockPengaturanRepo.save).toHaveBeenCalled();
    });

    it('should return existing settings if found', async () => {
      const mockSettings = { id: 1, atas_nama: 'Custom Admin' };
      mockPengaturanRepo.findOne.mockResolvedValue(mockSettings);
      const res = await service.getPengaturan();
      expect(res.atas_nama).toBe('Custom Admin');
    });
  });

  describe('simpanPengaturan', () => {
    it('should update and save setting fields', async () => {
      const mockSettings = { id: 1, atas_nama: 'Old Name' };
      mockPengaturanRepo.findOne.mockResolvedValue(mockSettings);

      const res = await service.simpanPengaturan({ atas_nama: 'New Name' });
      expect(res.atas_nama).toBe('New Name');
      expect(mockPengaturanRepo.save).toHaveBeenCalled();
    });
  });
});
