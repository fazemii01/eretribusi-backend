import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PembayaranService } from './pembayaran.service';
import { Pembayaran } from '../../entities/pembayaran.entity';
import { Invoice, InvoiceStatus } from '../../entities/invoice.entity';
import { Pelanggan } from '../../entities/pelanggan.entity';

describe('PembayaranService', () => {
  let service: PembayaranService;
  let mockPembayaranRepo: any;
  let mockInvoiceRepo: any;
  let mockPelangganRepo: any;

  beforeEach(async () => {
    mockPembayaranRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
      delete: jest.fn(),
      clear: jest.fn(),
    };

    mockInvoiceRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((inv) => Promise.resolve(inv)),
    };

    mockPelangganRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PembayaranService,
        { provide: getRepositoryToken(Pembayaran), useValue: mockPembayaranRepo },
        { provide: getRepositoryToken(Invoice), useValue: mockInvoiceRepo },
        { provide: getRepositoryToken(Pelanggan), useValue: mockPelangganRepo },
      ],
    }).compile();

    service = module.get<PembayaranService>(PembayaranService);
  });

  describe('simpanPembayaran', () => {
    it('should throw NotFoundException if invoice does not exist', async () => {
      mockInvoiceRepo.findOne.mockResolvedValue(null);
      await expect(
        service.simpanPembayaran({
          idInvoice: 'INV-999',
          status: InvoiceStatus.LUNAS,
          admin: 'Petugas DLH',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update invoice status to Lunas and create receipt entry', async () => {
      const mockInv = {
        id_invoice: 'INV-2604-PEL001',
        id_pelanggan: 'PEL-001',
        bulan: 'April 2026',
        nominal: 15000,
        status: InvoiceStatus.BELUM_LUNAS,
        penerima: '-',
      };

      mockInvoiceRepo.findOne.mockResolvedValue(mockInv);
      mockPembayaranRepo.findOne.mockResolvedValue(null);

      const res = await service.simpanPembayaran({
        idInvoice: 'INV-2604-PEL001',
        status: InvoiceStatus.LUNAS,
        admin: 'Petugas Loket DLH',
      });

      expect(res.status).toBe(InvoiceStatus.LUNAS);
      expect(res.penerima).toBe('Petugas Loket DLH');
      expect(mockPembayaranRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_kuitansi: 'PAY-INV-2604-PEL001',
          id_invoice: 'INV-2604-PEL001',
          id_pelanggan: 'PEL-001',
          admin: 'Petugas Loket DLH',
        }),
      );
    });
  });
});
