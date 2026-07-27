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

  async checkAndGenerateMonthlyInvoices(force: boolean = false) {
    const today = new Date();
    const currentDay = today.getDate();

    // Default cron schedule: 1st day of the month (or force execution for testing)
    if (currentDay === 1 || force) {
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
      ];
      const bulanName = monthNames[today.getMonth()];
      const tahunStr = today.getFullYear().toString();

      this.logger.log(`[Cron Job Triggered${force ? ' (Manual Test)' : ''}] Auto-generating mass invoices for ${bulanName} ${tahunStr}...`);
      try {
        const result = await this.tagihanService.generateTagihanMassal(bulanName, tahunStr);
        this.logger.log(`[Cron Job Finished] Successfully generated invoices for ${bulanName} ${tahunStr}`);
        return { success: true, message: `Invoices generated for ${bulanName} ${tahunStr}`, data: result };
      } catch (err) {
        this.logger.error(`[Cron Job Error] Failed to generate invoices: ${err.message}`);
        return { success: false, error: err.message };
      }
    } else {
      this.logger.log(`[Cron Job Check] Today is day ${currentDay} of the month. Cron job runs on day 1. Skipping auto-generation.`);
      return { success: true, message: `Skipped: Today is day ${currentDay}. Cron runs on 1st of month.` };
    }
  }
}
