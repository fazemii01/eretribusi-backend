import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WilayahService } from './wilayah.service';
import { Wilayah } from '../../entities/wilayah.entity';

describe('WilayahService', () => {
  let service: WilayahService;
  let mockWilayahRepo: any;

  beforeEach(async () => {
    mockWilayahRepo = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn().mockImplementation((w) => w),
      save: jest.fn().mockImplementation((w) => Promise.resolve(w)),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WilayahService,
        { provide: getRepositoryToken(Wilayah), useValue: mockWilayahRepo },
      ],
    }).compile();

    service = module.get<WilayahService>(WilayahService);
  });

  describe('getMasterWilayah', () => {
    it('should return grouped kelurahan lists by kecamatan', async () => {
      const mockList = [
        { id: 1, kecamatan: 'LUMAJANG', kelurahan: 'Jogoyudan' },
        { id: 2, kecamatan: 'LUMAJANG', kelurahan: 'Tompokersan' },
        { id: 3, kecamatan: 'SUKODONO', kelurahan: 'Kutorenon' },
      ];
      mockWilayahRepo.find.mockResolvedValue(mockList);

      const res = await service.getMasterWilayah();
      expect(res).toEqual({
        LUMAJANG: ['Jogoyudan', 'Tompokersan'],
        SUKODONO: ['Kutorenon'],
      });
    });
  });

  describe('createOrUpdate', () => {
    it('should create new wilayah if id not present', async () => {
      const input = { kecamatan: 'LUMAJANG', kelurahan: 'Ditotrunan', kode_kel: 'DTT' };
      const res = await service.createOrUpdate(input);

      expect(res.kelurahan).toBe('Ditotrunan');
      expect(mockWilayahRepo.create).toHaveBeenCalled();
      expect(mockWilayahRepo.save).toHaveBeenCalled();
    });
  });
});
