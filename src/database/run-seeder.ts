import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Pelanggan } from '../entities/pelanggan.entity';
import { Invoice } from '../entities/invoice.entity';
import { Pembayaran } from '../entities/pembayaran.entity';
import { Tarif } from '../entities/tarif.entity';
import { Wilayah } from '../entities/wilayah.entity';
import { User } from '../entities/user.entity';
import { Pengaturan } from '../entities/pengaturan.entity';
import { seedInitialData } from './seed-data';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'erestribusi_db',
  entities: [Pelanggan, Invoice, Pembayaran, Tarif, Wilayah, User, Pengaturan],
  synchronize: false,
});

async function main() {
  console.log('[CLI Seeder] Connecting to MySQL database...');
  try {
    await dataSource.initialize();
    console.log('[CLI Seeder] Database connection established.');
    await seedInitialData(dataSource);
    console.log('[CLI Seeder] Database seeding finished successfully!');
  } catch (err) {
    console.error('[CLI Seeder] Seeding error:', err);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(0);
  }
}

main();
