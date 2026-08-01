import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PelangganService } from './pelanggan.service';
import { Pelanggan } from '../../entities/pelanggan.entity';
import { Wilayah } from '../../entities/wilayah.entity';
import { Invoice } from '../../entities/invoice.entity';
import { Pembayaran } from '../../entities/pembayaran.entity';
import { SearchService } from '../elasticsearch/search.service';

describe('PelangganService', () => {
  let service: PelangganService;
  let mockPelangganRepo: any;
  let mockWilayahRepo: any;
  let mockInvoiceRepo: any;
  let mockPembayaranRepo: any;
  let mockSearchService: any;

  beforeEach(async () => {
    mockPelangganRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
    };

    mockWilayahRepo = { findOne: jest.fn() };
    mockInvoiceRepo = { delete: jest.fn() };
    mockPembayaranRepo = { delete: jest.fn() };

    mockSearchService = {
      searchPelanggan: jest.fn().mockResolvedValue([]),
      indexPelanggan: jest.fn().mockResolvedValue(true),
      deletePelangganIndex: jest.fn().mockResolvedValue(true),
      bulkIndexPelanggan: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PelangganService,
        { provide: getRepositoryToken(Pelanggan), useValue: mockPelangganRepo },
        { provide: getRepositoryToken(Wilayah), useValue: mockWilayahRepo },
        { provide: getRepositoryToken(Invoice), useValue: mockInvoiceRepo },
        { provide: getRepositoryToken(Pembayaran), useValue: mockPembayaranRepo },
        { provide: SearchService, useValue: mockSearchService },
      ],
    }).compile();

    service = module.get<PelangganService>(PelangganService);
  });

  describe('findOne', () => {
    it('should throw NotFoundException if customer does not exist', async () => {
      mockPelangganRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('UNKNOWN')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return customer if found', async () => {
      const mock = { id_pelanggan: 'LMJ-JGY-0001', nama: 'Budi' };
      mockPelangganRepo.findOne.mockResolvedValue(mock);
      const res = await service.findOne('LMJ-JGY-0001');
      expect(res).toEqual(mock);
    });
  });

  describe('createOrUpdate', () => {
    it('should auto-generate customer ID if not provided', async () => {
      mockWilayahRepo.findOne.mockResolvedValue({ kode_kel: 'JGY' });
      mockPelangganRepo.findOne.mockResolvedValue(null);

      const input = { nama: 'Siti', kecamatan: 'LUMAJANG', kelurahan: 'Jogoyudan', va: 1002 };
      const res = await service.createOrUpdate(input as any);

      expect(res.id_pelanggan).toMatch(/^LMJ-JGY-\d{4}$/);
      expect(mockSearchService.indexPelanggan).toHaveBeenCalled();
    });
  });
});
