import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SnapPaymentService } from './snap-payment.service';
import { Invoice, InvoiceStatus } from '../../entities/invoice.entity';
import { Pembayaran } from '../../entities/pembayaran.entity';

describe('SnapPaymentService', () => {
  let service: SnapPaymentService;
  let mockInvoiceRepo: any;
  let mockPembayaranRepo: any;

  beforeEach(async () => {
    mockInvoiceRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((inv) => Promise.resolve(inv)),
    };

    mockPembayaranRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const configMap: Record<string, string> = {
          SNAP_BASE_URL: 'https://sandbox.bankjatim.co.id',
          SNAP_CLIENT_KEY: 'test-client-key',
          SNAP_CLIENT_SECRET: 'test-client-secret',
          SNAP_PRIVATE_KEY: 'test-private-key',
          SNAP_PARTNER_SERVICE_ID: '88888',
          SNAP_MERCHANT_ID: 'DLH_LUMAJANG_01',
        };
        return configMap[key] || '';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SnapPaymentService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(Invoice), useValue: mockInvoiceRepo },
        { provide: getRepositoryToken(Pembayaran), useValue: mockPembayaranRepo },
      ],
    }).compile();

    service = module.get<SnapPaymentService>(SnapPaymentService);
  });

  describe('generateB2BSignature', () => {
    it('should generate HMAC-SHA256 signature string', () => {
      const sig = service.generateB2BSignature('2026-08-01T10:00:00Z');
      expect(typeof sig).toBe('string');
      expect(sig.length).toBeGreaterThan(0);
    });
  });

  describe('generateRequestSignature', () => {
    it('should generate HMAC-SHA512 base64 signature for API request', () => {
      const sig = service.generateRequestSignature(
        'POST',
        '/v1.0/qr/qr-mpm-generate',
        'mock-token',
        { partnerReferenceNo: 'INV-2604-PEL001' },
        '2026-08-01T10:00:00Z',
      );
      expect(typeof sig).toBe('string');
      expect(sig.length).toBeGreaterThan(0);
    });
  });

  describe('createDynamicQris', () => {
    it('should generate EMVCo QRIS string payload containing invoice ID and nominal', async () => {
      const res = await service.createDynamicQris('INV-2604-PEL001', 15000);
      expect(res.responseCode).toBe('2004700');
      expect(res.partnerReferenceNo).toBe('INV-2604-PEL001');
      expect(res.qrContent).toContain('INV-2604-PEL001');
    });
  });

  describe('processPaymentNotification', () => {
    it('should mark invoice as Lunas upon receiving valid webhook notification', async () => {
      const mockInv = {
        id_invoice: 'INV-2604-PEL001',
        id_pelanggan: 'PEL-001',
        bulan: 'April 2026',
        nominal: 15000,
        status: InvoiceStatus.BELUM_LUNAS,
      };

      mockInvoiceRepo.findOne.mockResolvedValue(mockInv);
      mockPembayaranRepo.findOne.mockResolvedValue(null);

      const notification = { trxId: 'INV-2604-PEL001', referenceNo: 'BANK-REF-123' };
      const res = await service.processPaymentNotification(notification);

      expect(res.responseCode).toBe('2002500');
      expect(mockInv.status).toBe(InvoiceStatus.LUNAS);
      expect(mockPembayaranRepo.save).toHaveBeenCalled();
    });
  });
});
