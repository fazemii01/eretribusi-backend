import { Injectable, Logger } from '@nestjs/common';
import { TagihanService } from './tagihan.service';

@Injectable()
export class TagihanCronService {
  private readonly logger = new Logger(TagihanCronService.name);
  private lastRunMonthYear: string = '';

  constructor(private readonly tagihanService: TagihanService) {
    this.initCronScheduler();
  }

  /**
   * Initializes background scheduler for monthly automated invoice generation
   */
  private initCronScheduler() {
    this.logger.log('TagihanCronService initialized: Monthly invoice auto-generation active.');

    // Run safe initial check shortly after boot (after 10 seconds)
    setTimeout(() => {
      this.checkAndGenerateMonthlyInvoices();
    }, 10000);

    // Periodic check every hour for robust scheduling
    const CHECK_INTERVAL_MS = 60 * 60 * 1000;
    setInterval(() => {
      this.checkAndGenerateMonthlyInvoices();
    }, CHECK_INTERVAL_MS);
  }

  async checkAndGenerateMonthlyInvoices(force: boolean = false) {
    const today = new Date();
    const currentDay = today.getDate();
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const bulanName = monthNames[today.getMonth()];
    const tahunStr = today.getFullYear().toString();
    const currentMonthYearKey = `${bulanName} ${tahunStr}`;

    // Prevent duplicate automated execution in the same month
    if (!force && this.lastRunMonthYear === currentMonthYearKey) {
      return { success: true, message: `Tagihan periode ${currentMonthYearKey} sudah diproses sebelumnya.` };
    }

    // Default cron schedule: 1st day of the month (or force execution for testing/admin)
    if (currentDay === 1 || force) {
      this.logger.log(`[Cron Job Triggered${force ? ' (Manual Trigger)' : ''}] Auto-generating mass invoices for ${bulanName} ${tahunStr}...`);
      try {
        const result = await this.tagihanService.generateTagihanMassal(bulanName, tahunStr);
        this.lastRunMonthYear = currentMonthYearKey;
        this.logger.log(`[Cron Job Finished] Successfully processed invoices for ${bulanName} ${tahunStr}`);
        return { success: true, message: `Invoices generated for ${bulanName} ${tahunStr}`, data: result };
      } catch (err) {
        this.logger.error(`[Cron Job Error] Failed to generate invoices: ${err.message}`);
        return { success: false, error: err.message };
      }
    } else {
      this.logger.log(`[Cron Job Check] Today is day ${currentDay} of the month. Automated generation runs on day 1.`);
      return { success: true, message: `Skipped: Today is day ${currentDay}. Cron runs on 1st of month.` };
    }
  }
}

