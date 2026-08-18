import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { SnapPaymentService } from './snap-payment.service';

@Controller('api/payment/snap')
export class SnapPaymentController {
  constructor(private readonly snapService: SnapPaymentService) {}

  @Post('create-va')
  async createVA(@Body() body: { idInvoice: string; idPelanggan: string; nama: string; nominal: number }) {
    return this.snapService.createVirtualAccount(body.idInvoice, body.idPelanggan, body.nama, body.nominal);
  }

  @Post('create-qris')
  async createQRIS(@Body() body: { idInvoice: string; nominal: number }) {
    return this.snapService.createDynamicQris(body.idInvoice, body.nominal);
  }

  @HttpCode(HttpStatus.OK)
  @Post('notify')
  async handlePaymentNotification(
    @Body() body: any,
    @Headers('x-signature') signature?: string,
    @Headers('x-timestamp') timestamp?: string,
    @Headers('x-partner-id') partnerId?: string,
  ) {
    return this.snapService.processPaymentNotification(body, {
      signature,
      timestamp,
      partnerId,
    });
  }
}

