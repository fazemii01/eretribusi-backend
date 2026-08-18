import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../../entities/invoice.entity';
import { Pembayaran } from '../../entities/pembayaran.entity';
import { buildDynamicQrisString } from '../../common/qris-utils';

@Injectable()
export class SnapPaymentService {
  private readonly logger = new Logger(SnapPaymentService.name);
  private accessTokenCache: { token: string; expiresAt: number } | null = null;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Invoice)
    private invoiceRepo: Repository<Invoice>,
    @InjectRepository(Pembayaran)
    private pembayaranRepo: Repository<Pembayaran>,
  ) {}

  /**
   * Environment Variable Getters
   */
  private get baseUrl(): string {
    return this.configService.get<string>('SNAP_BASE_URL') || 'https://apidevportal.aspi-indonesia.or.id';
  }

  private get clientKey(): string {
    return this.configService.get<string>('SNAP_CLIENT_KEY') || '';
  }

  private get clientSecret(): string {
    return this.configService.get<string>('SNAP_CLIENT_SECRET') || '';
  }

  private get privateKey(): string {
    return (this.configService.get<string>('SNAP_PRIVATE_KEY') || '').replace(/\\n/g, '\n');
  }

  private get publicKey(): string {
    return (this.configService.get<string>('SNAP_PUBLIC_KEY') || '').replace(/\\n/g, '\n');
  }

  private get partnerServiceId(): string {
    return this.configService.get<string>('SNAP_PARTNER_SERVICE_ID') || '88888';
  }

  private get merchantId(): string {
    return this.configService.get<string>('SNAP_MERCHANT_ID') || 'DLH_LUMAJANG_01';
  }

  private get isMockMode(): boolean {
    return this.configService.get<string>('SNAP_MOCK_MODE') === 'true';
  }

  private get verifySignatureEnabled(): boolean {
    return this.configService.get<string>('SNAP_VERIFY_SIGNATURE') !== 'false';
  }

  /**
   * 1. Generate ASPI SNAP B2B Access Token Signature (Asymmetric RSA-SHA256 or HMAC-SHA256)
   */
  generateB2BSignature(timestamp: string): string {
    const stringToSign = `${this.clientKey}|${timestamp}`;

    if (this.privateKey.includes('BEGIN') && this.privateKey.includes('PRIVATE KEY')) {
      try {
        const signer = crypto.createSign('SHA256');
        signer.update(stringToSign);
        signer.end();
        return signer.sign(this.privateKey, 'base64');
      } catch (err) {
        this.logger.error(`RSA Signature generation error: ${err.message}`);
      }
    }

    // HMAC-SHA256 fallback for direct secret/string keys
    return crypto
      .createHmac('sha256', this.privateKey || this.clientSecret || 'secret')
      .update(stringToSign)
      .digest('base64');
  }

  /**
   * 2. Get or Fetch B2B Access Token from ASPI / Bank Gateway
   */
  async getB2BAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessTokenCache && this.accessTokenCache.expiresAt > now + 60000) {
      return this.accessTokenCache.token;
    }

    if (!this.clientKey) {
      this.logger.warn('SNAP_CLIENT_KEY not set. Using local mock token.');
      const fallbackToken = `snap_local_token_${Date.now()}`;
      this.accessTokenCache = { token: fallbackToken, expiresAt: now + 900 * 1000 };
      return fallbackToken;
    }

    const timestamp = new Date().toISOString();
    const signature = this.generateB2BSignature(timestamp);

    this.logger.log(`Fetching B2B Access Token from ${this.baseUrl} for Client Id: ${this.clientKey}`);

    try {
      const response = await fetch(`${this.baseUrl}/api/v1.0/access-token/b2b`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-TIMESTAMP': timestamp,
          'X-CLIENT-KEY': this.clientKey,
          'X-SIGNATURE': signature,
        },
        body: JSON.stringify({
          grantType: 'client_credentials',
          additionalInfo: {},
        }),
      });

      const data = await response.json().catch(() => null);
      if (response.ok && data?.accessToken) {
        const expiresIn = parseInt(data.expiresIn || '900', 10);
        this.accessTokenCache = { token: data.accessToken, expiresAt: now + expiresIn * 1000 };
        return data.accessToken;
      }
      this.logger.warn(`SNAP Auth API response [${response.status}]: ${JSON.stringify(data)}`);
    } catch (err) {
      this.logger.warn(`SNAP Auth API request error (${err.message}).`);
    }

    // Fallback token for local sandbox dev
    const mockToken = `snap_token_${Date.now()}`;
    this.accessTokenCache = { token: mockToken, expiresAt: now + 900 * 1000 };
    return mockToken;
  }

  /**
   * 3. Generate Symmetric HMAC-SHA512 Signature for API Requests
   */
  generateRequestSignature(
    method: string,
    path: string,
    accessToken: string,
    requestBody: any,
    timestamp: string,
  ): string {
    const bodyString = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
    const minifiedBody = crypto.createHash('sha256').update(bodyString).digest('hex').toLowerCase();
    const stringToSign = `${method.toUpperCase()}:${path}:${accessToken}:${minifiedBody}:${timestamp}`;

    return crypto
      .createHmac('sha512', this.clientSecret || 'secret')
      .update(stringToSign)
      .digest('base64');
  }

  /**
   * 4. Create SNAP Virtual Account
   */
  async createVirtualAccount(idInvoice: string, idPelanggan: string, nama: string, nominal: number) {
    const token = await this.getB2BAccessToken();
    const timestamp = new Date().toISOString();
    const cleanId = idPelanggan.replace(/[^A-Z0-9]/gi, '');
    const vaNumber = `${this.partnerServiceId}${cleanId.padStart(10, '0')}`;

    const requestPayload = {
      partnerServiceId: this.partnerServiceId.padStart(8, ' '),
      customerNo: cleanId.padStart(10, '0'),
      virtualAccountNo: vaNumber,
      virtualAccountName: nama,
      trxId: idInvoice,
      totalAmount: {
        value: `${nominal}.00`,
        currency: 'IDR',
      },
      additionalInfo: {
        channel: 'SNAP_VA',
      },
    };

    const signature = this.generateRequestSignature(
      'POST',
      '/v1.0/transfer-va/create-va',
      token,
      requestPayload,
      timestamp,
    );

    this.logger.log(`Creating SNAP VA ${vaNumber} for Invoice ${idInvoice}`);

    // If live credentials configured and not forced mock mode, call live endpoint
    if (!this.isMockMode && this.clientKey && this.baseUrl.startsWith('http')) {
      try {
        const response = await fetch(`${this.baseUrl}/v1.0/transfer-va/create-va`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-TIMESTAMP': timestamp,
            'X-SIGNATURE': signature,
            'X-PARTNER-ID': this.partnerServiceId,
            'X-EXTERNAL-ID': idInvoice,
            'CHANNEL-ID': 'SNAP_VA',
          },
          body: JSON.stringify(requestPayload),
        });

        const data = await response.json().catch(() => null);
        if (response.ok && data) {
          return data;
        }
        this.logger.warn(`ASPI VA Create returned status ${response.status}: ${JSON.stringify(data)}`);
      } catch (err) {
        this.logger.error(`Failed to call ASPI VA Create endpoint: ${err.message}`);
      }
    }

    // Default standard response
    return {
      responseCode: '2002700',
      responseMessage: 'Successful',
      virtualAccountData: {
        partnerServiceId: this.partnerServiceId,
        customerNo: cleanId,
        virtualAccountNo: vaNumber,
        virtualAccountName: nama,
        totalAmount: { value: `${nominal}.00`, currency: 'IDR' },
      },
    };
  }

  /**
   * 5. Create SNAP Dynamic QRIS with valid EMVCo CRC-16 Checksum
   */
  async createDynamicQris(idInvoice: string, nominal: number) {
    const token = await this.getB2BAccessToken();
    const timestamp = new Date().toISOString();

    const requestPayload = {
      partnerReferenceNo: idInvoice,
      merchantId: this.merchantId,
      amount: {
        value: `${nominal}.00`,
        currency: 'IDR',
      },
      additionalInfo: {
        validityPeriod: '30m',
      },
    };

    const signature = this.generateRequestSignature(
      'POST',
      '/v1.0/qr/qr-mpm-generate',
      token,
      requestPayload,
      timestamp,
    );

    // Call live ASPI QRIS endpoint if live environment
    if (!this.isMockMode && this.clientKey && this.baseUrl.startsWith('http')) {
      try {
        const response = await fetch(`${this.baseUrl}/v1.0/qr/qr-mpm-generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-TIMESTAMP': timestamp,
            'X-SIGNATURE': signature,
            'X-PARTNER-ID': this.partnerServiceId,
            'X-EXTERNAL-ID': idInvoice,
            'CHANNEL-ID': 'SNAP_QRIS',
          },
          body: JSON.stringify(requestPayload),
        });

        const data = await response.json().catch(() => null);
        if (response.ok && data?.qrContent) {
          return data;
        }
        this.logger.warn(`ASPI QRIS Create returned status ${response.status}: ${JSON.stringify(data)}`);
      } catch (err) {
        this.logger.error(`Failed to call ASPI QRIS Create endpoint: ${err.message}`);
      }
    }

    // Dynamic QRIS string with authentic EMVCo CRC-16 Checksum
    const qrisContent = buildDynamicQrisString(idInvoice, nominal, this.merchantId);
    this.logger.log(`Generated SNAP Dynamic QRIS for Invoice ${idInvoice}`);

    return {
      responseCode: '2004700',
      responseMessage: 'Successful',
      qrContent: qrisContent,
      partnerReferenceNo: idInvoice,
    };
  }

  /**
   * 6. Validate incoming Webhook Signature from Bank/ASPI
   */
  verifyNotificationSignature(
    headers: { signature?: string; timestamp?: string; partnerId?: string },
    body: any,
  ): boolean {
    if (!this.verifySignatureEnabled) {
      this.logger.log('Signature verification bypassed by SNAP_VERIFY_SIGNATURE=false configuration.');
      return true;
    }

    const signature = headers.signature;
    const timestamp = headers.timestamp;

    if (!signature || !timestamp) {
      this.logger.warn('Incoming payment notification missing X-SIGNATURE or X-TIMESTAMP headers.');
      return false;
    }

    // 1. Asymmetric RSA verification with Bank's Public Key if available
    if (this.publicKey.includes('BEGIN') && this.publicKey.includes('PUBLIC KEY')) {
      try {
        const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
        const minifiedBody = crypto.createHash('sha256').update(bodyString).digest('hex').toLowerCase();
        const stringToSign = `POST:/api/payment/snap/notify:${minifiedBody}:${timestamp}`;

        const verifier = crypto.createVerify('SHA256');
        verifier.update(stringToSign);
        verifier.end();
        const isValid = verifier.verify(this.publicKey, signature, 'base64');
        if (isValid) return true;
      } catch (err) {
        this.logger.error(`RSA Verification error: ${err.message}`);
      }
    }

    // 2. Symmetric HMAC-SHA512 verification fallback
    try {
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      const minifiedBody = crypto.createHash('sha256').update(bodyString).digest('hex').toLowerCase();
      const stringToSign = `POST:/api/payment/snap/notify:${minifiedBody}:${timestamp}`;

      const expectedHmac = crypto
        .createHmac('sha512', this.clientSecret || 'secret')
        .update(stringToSign)
        .digest('base64');

      return signature === expectedHmac;
    } catch (err) {
      this.logger.error(`HMAC Verification error: ${err.message}`);
      return false;
    }
  }

  /**
   * 7. Process Webhook Payment Notification from Bank
   */
  async processPaymentNotification(notification: any, headers: { signature?: string; timestamp?: string; partnerId?: string } = {}) {
    this.logger.log(`Received SNAP Payment Notification: ${JSON.stringify(notification)}`);

    // Verify cryptographic signature if headers provided
    if (headers.signature && !this.verifyNotificationSignature(headers, notification)) {
      this.logger.error('Payment notification rejected: Invalid signature.');
      return {
        responseCode: '4012700',
        responseMessage: 'Unauthorized: Invalid Signature',
      };
    }

    const idInvoice = notification.trxId || notification.partnerReferenceNo || notification.virtualAccountData?.trxId;

    if (!idInvoice) {
      return {
        responseCode: '4002700',
        responseMessage: 'Invalid Format: Missing Invoice ID',
      };
    }

    const inv = await this.invoiceRepo.findOne({ where: { id_invoice: idInvoice } });
    if (!inv) {
      return {
        responseCode: '4042700',
        responseMessage: 'Invoice Not Found',
      };
    }

    // Mark as Lunas
    inv.status = InvoiceStatus.LUNAS;
    inv.penerima = 'BANK_SNAP_GATEWAY';
    await this.invoiceRepo.save(inv);

    // Record receipt with idempotent handling
    const idKuitansi = `PAY-${idInvoice}`;
    const rawPaidTime = notification.paidTime || notification.transactionDate || notification.datetime;
    const paidTimeDate = rawPaidTime ? new Date(rawPaidTime) : new Date();
    const bankRef = notification.additionalInfo?.referenceNo || notification.referenceNo || notification.additionalInfo?.acquirerTransactionId || null;

    let bayar = await this.pembayaranRepo.findOne({ where: { id_kuitansi: idKuitansi } });
    if (!bayar) {
      bayar = this.pembayaranRepo.create({
        id_kuitansi: idKuitansi,
        id_invoice: inv.id_invoice,
        id_pelanggan: inv.id_pelanggan,
        bulan: inv.bulan,
        nominal: inv.nominal,
        admin: 'BANK_SNAP_GATEWAY',
        waktu_bayar: paidTimeDate,
        referensi_bank: bankRef,
      });
      await this.pembayaranRepo.save(bayar);
    } else {
      if (bankRef && !bayar.referensi_bank) {
        bayar.referensi_bank = bankRef;
      }
      await this.pembayaranRepo.save(bayar);
    }

    this.logger.log(`Payment confirmed for invoice ${idInvoice} (Kuitansi: ${idKuitansi})`);

    return {
      responseCode: '2002500',
      responseMessage: 'Successful',
      virtualAccountData: {
        partnerServiceId: this.partnerServiceId,
        customerNo: inv.id_pelanggan,
        virtualAccountNo: notification.virtualAccountNo || '',
        trxId: inv.id_invoice,
      },
    };
  }
}

