import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { TarifService } from './tarif.service';
import { Tarif } from '../../entities/tarif.entity';

describe('TarifService', () => {
  let service: TarifService;
  let mockTarifRepo: any;

  beforeEach(async () => {
    mockTarifRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((t) => Promise.resolve(t)),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TarifService,
        { provide: getRepositoryToken(Tarif), useValue: mockTarifRepo },
      ],
    }).compile();

    service = module.get<TarifService>(TarifService);
  });

  describe('findAll', () => {
    it('should return list of tariffs ordered by VA', async () => {
      const mockList = [{ va: 1001, nominal: 15000 }];
      mockTarifRepo.find.mockResolvedValue(mockList);

      const res = await service.findAll();
      expect(res).toEqual(mockList);
    });
  });

  describe('createOrUpdate', () => {
    it('should create new tariff if VA does not exist', async () => {
      mockTarifRepo.findOne.mockResolvedValue(null);
      const res = await service.createOrUpdate({ va: 1001, nama_tarif: 'Rumah Tangga', nominal: 15000 });

      expect(res.va).toBe(1001);
      expect(mockTarifRepo.create).toHaveBeenCalled();
      expect(mockTarifRepo.save).toHaveBeenCalled();
    });

    it('should update nominal of existing tariff', async () => {
      const existing = { va: 1001, nama_tarif: 'Rumah Tangga', nominal: 10000 };
      mockTarifRepo.findOne.mockResolvedValue(existing);

      const res = await service.createOrUpdate({ va: 1001, nominal: 20000 });
      expect(res.nominal).toBe(20000);
      expect(mockTarifRepo.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if tariff does not exist', async () => {
      mockTarifRepo.findOne.mockResolvedValue(null);
      await expect(service.remove(9999)).rejects.toThrow(NotFoundException);
    });

    it('should remove existing tariff', async () => {
      const existing = { va: 1001, nominal: 15000 };
      mockTarifRepo.findOne.mockResolvedValue(existing);

      const res = await service.remove(1001);
      expect(res).toBe(true);
      expect(mockTarifRepo.remove).toHaveBeenCalledWith(existing);
    });
  });
});
