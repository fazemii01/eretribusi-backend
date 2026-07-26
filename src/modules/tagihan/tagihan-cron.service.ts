import { Injectable, Logger } from '@nestjs/common';
import { TagihanService } from './tagihan.service';

@Injectable()
export class TagihanCronService {
  private readonly logger = new Logger(TagihanCronService.name);

  constructor(private readonly tagihanService: TagihanService) {
    this.initCronScheduler();
  }

  /**
   * Initializes background scheduler for monthly automated invoice generation
   */
  private initCronScheduler() {
    this.logger.log('TagihanCronService initialized: Monthly invoice auto-generation active.');

    // Check once per day if today matches the scheduled generation date (e.g., 1st day of month)
    const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
    setInterval(() => {
      this.checkAndGenerateMonthlyInvoices();
    }, CHECK_INTERVAL_MS);
  }

  async checkAndGenerateMonthlyInvoices() {
    const today = new Date();
    const currentDay = today.getDate();

    // Default cron schedule: 1st day of the month
    if (currentDay === 1) {
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
      ];
      const bulanName = monthNames[today.getMonth()];
      const tahunStr = today.getFullYear().toString();

      this.logger.log(`[Cron Job Triggered] Auto-generating mass invoices for ${bulanName} ${tahunStr}...`);
      try {
        const count = await this.tagihanService.generateTagihanMassal(bulanName, tahunStr);
        this.logger.log(`[Cron Job Finished] Successfully generated ${count} invoices for ${bulanName} ${tahunStr}`);
      } catch (err) {
        this.logger.error(`[Cron Job Error] Failed to generate invoices: ${err.message}`);
      }
    }
  }
}
