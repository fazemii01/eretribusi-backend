import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TagihanService } from './tagihan.service';
import { Invoice, InvoiceStatus } from '../../entities/invoice.entity';
import { Pelanggan } from '../../entities/pelanggan.entity';
import { Tarif } from '../../entities/tarif.entity';

describe('TagihanService', () => {
  let service: TagihanService;
  let mockInvoiceRepo: any;
  let mockPelangganRepo: any;
  let mockTarifRepo: any;

  beforeEach(async () => {
    mockInvoiceRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
      clear: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }),
      count: jest.fn(),
    };

    mockPelangganRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }),
    };

    mockTarifRepo = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagihanService,
        { provide: getRepositoryToken(Invoice), useValue: mockInvoiceRepo },
        { provide: getRepositoryToken(Pelanggan), useValue: mockPelangganRepo },
        { provide: getRepositoryToken(Tarif), useValue: mockTarifRepo },
      ],
    }).compile();

    service = module.get<TagihanService>(TagihanService);
  });

  describe('getMonthCode', () => {
    it('should correctly convert month names to two-digit month codes', () => {
      expect(service.getMonthCode('Januari')).toBe('01');
      expect(service.getMonthCode('Februari')).toBe('02');
      expect(service.getMonthCode('Maret')).toBe('03');
      expect(service.getMonthCode('April')).toBe('04');
      expect(service.getMonthCode('Mei')).toBe('05');
      expect(service.getMonthCode('Juni')).toBe('06');
      expect(service.getMonthCode('Juli')).toBe('07');
      expect(service.getMonthCode('Agustus')).toBe('08');
      expect(service.getMonthCode('September')).toBe('09');
      expect(service.getMonthCode('Oktober')).toBe('10');
      expect(service.getMonthCode('November')).toBe('11');
      expect(service.getMonthCode('Desember')).toBe('12');
    });

    it('should handle numeric month strings', () => {
      expect(service.getMonthCode('4')).toBe('04');
      expect(service.getMonthCode('06')).toBe('06');
      expect(service.getMonthCode('12')).toBe('12');
    });
  });

  describe('generateTagihanMassal - Gap Month Uniqueness', () => {
    it('should generate distinct primary keys (INV-2604 vs INV-2606) for April vs June without overwriting', async () => {
      const mockPelanggan = [
        { id_pelanggan: 'PEL-001', nama: 'Budi', va: 1001 },
      ];
      const mockTarif = [{ va: 1001, nominal: 15000 }];

      mockPelangganRepo.find.mockResolvedValue(mockPelanggan);
      mockTarifRepo.find.mockResolvedValue(mockTarif);
      mockInvoiceRepo.find.mockResolvedValue([]); // No existing invoices

      // Generate April invoice
      await service.generateTagihanMassal('April', '2026');

      expect(mockInvoiceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_invoice: 'INV-2604-PEL001',
          bulan: 'April 2026',
          nominal: 15000,
          status: InvoiceStatus.BELUM_LUNAS,
        }),
      );

      mockInvoiceRepo.create.mockClear();

      // Generate June invoice
      await service.generateTagihanMassal('Juni', '2026');

      expect(mockInvoiceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_invoice: 'INV-2606-PEL001',
          bulan: 'Juni 2026',
          nominal: 15000,
          status: InvoiceStatus.BELUM_LUNAS,
        }),
      );

      mockInvoiceRepo.create.mockClear();

      // Generate July invoice
      await service.generateTagihanMassal('Juli', '2026');

      expect(mockInvoiceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_invoice: 'INV-2607-PEL001',
          bulan: 'Juli 2026',
          nominal: 15000,
          status: InvoiceStatus.BELUM_LUNAS,
        }),
      );

      mockInvoiceRepo.create.mockClear();

      // Generate April 2027 invoice for multi-year scaling
      await service.generateTagihanMassal('April', '2027');

      expect(mockInvoiceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_invoice: 'INV-2704-PEL001',
          bulan: 'April 2027',
          nominal: 15000,
          status: InvoiceStatus.BELUM_LUNAS,
        }),
      );

      mockInvoiceRepo.create.mockClear();

      // Generate April 2030 invoice for long-term future year scaling
      await service.generateTagihanMassal('April', '2030');

      expect(mockInvoiceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_invoice: 'INV-3004-PEL001',
          bulan: 'April 2030',
          nominal: 15000,
          status: InvoiceStatus.BELUM_LUNAS,
        }),
      );
    });

    it('should create invoices ONLY for missing customers in the same month and skip existing ones with notification', async () => {
      const mockPelanggan = [
        { id_pelanggan: 'PEL-001', nama: 'User A', va: 1001 },
        { id_pelanggan: 'PEL-002', nama: 'User B', va: 1001 },
      ];
      const mockTarif = [{ va: 1001, nominal: 15000 }];

      // User A already has an invoice for "Juli 2026", User B does NOT
      const existingInvoices = [
        { id_invoice: 'INV-2607-PEL001', id_pelanggan: 'PEL-001', bulan: 'Juli 2026' },
      ];

      mockPelangganRepo.find.mockResolvedValue(mockPelanggan);
      mockTarifRepo.find.mockResolvedValue(mockTarif);
      mockInvoiceRepo.find.mockResolvedValue(existingInvoices);

      mockInvoiceRepo.create.mockClear();

      const result = await service.generateTagihanMassal('Juli', '2026');

      expect(result.createdCount).toBe(1);
      expect(result.skippedCount).toBe(1);
      expect(result.pesan).toContain('Berhasil menerbitkan 1 tagihan baru');
      expect(result.pesan).toContain('1 pelanggan sudah memiliki tagihan');

      // User B created, User A NOT re-created/overwritten
      expect(mockInvoiceRepo.create).toHaveBeenCalledTimes(1);
      expect(mockInvoiceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_invoice: 'INV-2607-PEL002',
          id_pelanggan: 'PEL-002',
          bulan: 'Juli 2026',
        }),
      );
    });
  });

  describe('findPublicBill', () => {
    it('should return empty result if cleanId is empty', async () => {
      const res = await service.findPublicBill('');
      expect(res).toEqual({ pelanggan: null, tagihan: [] });
    });
  });

  describe('findAll', () => {
    it('should return empty array and clear repo if no customers exist', async () => {
      mockPelangganRepo.find.mockResolvedValue([]);
      const res = await service.findAll();
      expect(res).toEqual([]);
      expect(mockInvoiceRepo.clear).toHaveBeenCalled();
    });
  });
});
