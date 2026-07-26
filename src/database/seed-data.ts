import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { Wilayah } from '../entities/wilayah.entity';
import { Tarif } from '../entities/tarif.entity';
import { User, UserRole } from '../entities/user.entity';
import { Pengaturan } from '../entities/pengaturan.entity';
import { Pelanggan } from '../entities/pelanggan.entity';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';

/**
 * List of sheet names to explicitly exclude from seeding processing
 */
const EXCLUDED_SHEETS = [
  'data_pelanggan2',
  'sheet2',
  'sheet3',
  'sheet4',
  'sheet5',
  'sheet6',
  'sheet7',
  'sheet8',
  'sheet9',
];

/**
 * Helper to parse CSV for Data Pengaturan from folder `contoh`
 */
function loadPengaturanFromCSV(): {
  no_rekening: string;
  atas_nama: string;
  link_qris: string;
  no_wa_admin: string;
} {
  const possiblePaths = [
    path.resolve(process.cwd(), '../contoh/Data Retribusi - Data_Pengaturan.csv'),
    path.resolve(process.cwd(), 'contoh/Data Retribusi - Data_Pengaturan.csv'),
    path.resolve(__dirname, '../../../../contoh/Data Retribusi - Data_Pengaturan.csv'),
  ];

  for (const csvPath of possiblePaths) {
    if (fs.existsSync(csvPath)) {
      try {
        const content = fs.readFileSync(csvPath, 'utf-8').trim();
        const lines = content.split(/\r?\n/);
        if (lines.length >= 2) {
          const values = lines[1].split(',').map((val) => val.trim());
          console.log(`[Seeder] Loaded Pengaturan data from CSV: ${csvPath}`);
          return {
            no_rekening: values[0] || 'BANK JATIM - 1061001847',
            atas_nama: values[1] || 'Bendahara Penerimaan DLH',
            link_qris: values[2] || 'https://drive.google.com/file/d/1AIPSf_QPlWT7nYX699LVMuHZiESs464N/view?usp=drivesdk',
            no_wa_admin: values[3] || '6281234567890',
          };
        }
      } catch (err) {
        console.warn('[Seeder] Error reading Pengaturan CSV file, falling back to default:', err);
      }
    }
  }

  console.log('[Seeder] Using standard Pengaturan settings');
  return {
    no_rekening: 'BANK JATIM - 1061001847',
    atas_nama: 'Bendahara Penerimaan DLH',
    link_qris: 'https://drive.google.com/file/d/1AIPSf_QPlWT7nYX699LVMuHZiESs464N/view?usp=drivesdk',
    no_wa_admin: '6281234567890',
  };
}

export async function seedInitialData(dataSource: DataSource) {
  console.log('--- STARTING FRESH DATABASE SEEDER ---');
  console.log(`[Seeder] Excluded sheet lists: ${EXCLUDED_SHEETS.join(', ')}`);

  // Clear existing database tables for a clean seed reset
  try {
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await dataSource.query('DELETE FROM data_bayar');
    await dataSource.query('DELETE FROM data_invoice');
    await dataSource.query('DELETE FROM data_pelanggan');
    await dataSource.query('DELETE FROM master_wilayah');
    await dataSource.query('DELETE FROM master_tarif');
    await dataSource.query('DELETE FROM data_admin');
    await dataSource.query('DELETE FROM data_pengaturan');
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('[Seeder] Cleared all existing data from tables');
  } catch (err) {
    console.warn('[Seeder] Could not clear tables via DELETE, proceeding with seed check:', err);
  }

  // 1. Seed Master Wilayah (7 Kelurahan in Lumajang)
  const wilayahRepo = dataSource.getRepository(Wilayah);
  const wilayahList = [
    { kecamatan: 'Lumajang', kelurahan: 'Jogoyudan', kode_kel: 'JGY' },
    { kecamatan: 'Lumajang', kelurahan: 'Jogotrunan', kode_kel: 'JGT' },
    { kecamatan: 'Lumajang', kelurahan: 'Rogotrunan', kode_kel: 'RGT' },
    { kecamatan: 'Lumajang', kelurahan: 'Citrodiwangsan', kode_kel: 'CTR' },
    { kecamatan: 'Lumajang', kelurahan: 'Tompokersan', kode_kel: 'TMP' },
    { kecamatan: 'Lumajang', kelurahan: 'Kepuharjo', kode_kel: 'KPH' },
    { kecamatan: 'Lumajang', kelurahan: 'Ditotrunan', kode_kel: 'DTR' },
  ];
  await wilayahRepo.save(wilayahList);
  console.log(`[Seeder] Seeded ${wilayahList.length} Master Wilayah`);

  // 2. Seed Master Tarif (14 Tiers)
  const tarifRepo = dataSource.getRepository(Tarif);
  const tarifList = [
    { va: 450, nama_tarif: 'Rumah Tangga R1-450VA', nominal: 10000 },
    { va: 900, nama_tarif: 'Rumah Tangga R1-900VA', nominal: 15000 },
    { va: 1300, nama_tarif: 'Rumah Tangga R1-1300VA', nominal: 25000 },
    { va: 2200, nama_tarif: 'Rumah Tangga R1-2200VA', nominal: 35000 },
    { va: 3500, nama_tarif: 'Rumah Tangga R2-3500VA (Mewah)', nominal: 50000 },
    { va: 5500, nama_tarif: 'Komersial / Minimarket (5500VA)', nominal: 75000 },
    { va: 6600, nama_tarif: 'Toko / Ruko Niaga', nominal: 35000 },
    { va: 7700, nama_tarif: 'Restoran & Rumah Makan', nominal: 100000 },
    { va: 8800, nama_tarif: 'Hotel & Penginapan', nominal: 150000 },
    { va: 9900, nama_tarif: 'Perkantoran Swasta / Bank', nominal: 75000 },
    { va: 11000, nama_tarif: 'Puskesmas & Klinik Kesehatan', nominal: 100000 },
    { va: 13200, nama_tarif: 'Rumah Sakit Umum (RSUD)', nominal: 250000 },
    { va: 16500, nama_tarif: 'Kios Pasar Tradisional', nominal: 20000 },
    { va: 22000, nama_tarif: 'Industri / Pabrik Pengolahan', nominal: 300000 },
  ];
  await tarifRepo.save(tarifList);
  console.log(`[Seeder] Seeded ${tarifList.length} Master Tarif categories`);

  // 3. Seed User Admin (ketua, admin, petugas)
  const userRepo = dataSource.getRepository(User);
  const passKetua = await bcrypt.hash('ketua123', 10);
  const passAdmin = await bcrypt.hash('admin123', 10);
  const passPetugas = await bcrypt.hash('petugas123', 10);

  await userRepo.save([
    { username: 'ketua', password: passKetua, nama_lengkap: 'Drs. H. Hendra Wijaya', role: UserRole.KETUA },
    { username: 'admin', password: passAdmin, nama_lengkap: 'Budi Santoso, S.E.', role: UserRole.ADMIN },
    { username: 'petugas', password: passPetugas, nama_lengkap: 'Ahmad Fauzi', role: UserRole.PETUGAS },
  ]);
  console.log('[Seeder] Seeded Initial Users (ketua, admin, petugas)');

  // 4. Seed Data Pengaturan from CSV in `contoh` folder
  const pengaturanRepo = dataSource.getRepository(Pengaturan);
  const pengaturanData = loadPengaturanFromCSV();
  await pengaturanRepo.save({
    id: 1,
    ...pengaturanData,
  });
  console.log('[Seeder] Seeded Data Pengaturan from CSV');

  // 5. Seed Data Pelanggan & Data Invoice (1,050 Clean Records Across 7 Kelurahan)
  const pelangganRepo = dataSource.getRepository(Pelanggan);
  const invoiceRepo = dataSource.getRepository(Invoice);

  const streetNames = ['Jl. Trunojoyo', 'Jl. Ahmad Yani', 'Jl. Gajah Mada', 'Jl. Diponegoro', 'Jl. Veteran', 'Jl. Sukarno Hatta', 'Jl. Pahlawan'];
  const sampleNames = ['Budi Santoso', 'Siti Aminah', 'Agus Setiawan', 'Rina Wijaya', 'Eko Prasetyo', 'Hendra Kusuma', 'Dewi Lestari', 'Bambang Utomo', 'Sri Wahyuni', 'Dedi Supriadi'];

  const pelangganList: Pelanggan[] = [];
  const invoiceList: Invoice[] = [];
  let overallSeq = 1;

  for (const kel of wilayahList) {
    let kelSeq = 1;
    for (let rwNum = 1; rwNum <= 5; rwNum++) {
      for (let rtNum = 1; rtNum <= 5; rtNum++) {
        for (let c = 1; c <= 6; c++) {
          const seqStr = ('000' + kelSeq).slice(-4);
          const idPelanggan = `LMJ-${kel.kode_kel}-${seqStr}`;
          const nama = sampleNames[(overallSeq - 1) % sampleNames.length];
          const street = streetNames[(overallSeq - 1) % streetNames.length];
          const rt = ('0' + rtNum).slice(-2);
          const rw = ('0' + rwNum).slice(-2);
          const va = [450, 900, 1300, 2200][(overallSeq - 1) % 4];

          const p = pelangganRepo.create({
            id_pelanggan: idPelanggan,
            nama,
            alamat: `${street} No. ${c * 3 + rwNum}`,
            rt,
            rw,
            kelurahan: kel.kelurahan,
            kecamatan: kel.kecamatan,
            va,
            no_hp: `6281234${('00000' + overallSeq).slice(-5)}`,
          });
          pelangganList.push(p);

          const nominalMap: Record<number, number> = { 450: 10000, 900: 15000, 1300: 25000, 2200: 35000 };
          const nominal = nominalMap[va] || 15000;

          // Invoice Maret 2026
          invoiceList.push(
            invoiceRepo.create({
              id_invoice: `INV-2603-${idPelanggan}`,
              id_pelanggan: idPelanggan,
              bulan: 'Maret 2026',
              nominal,
              status: overallSeq % 3 === 0 ? InvoiceStatus.LUNAS : InvoiceStatus.BELUM_LUNAS,
              penerima: overallSeq % 3 === 0 ? 'Admin DLH' : '-',
            }),
          );

          // Invoice Februari 2026
          invoiceList.push(
            invoiceRepo.create({
              id_invoice: `INV-2602-${idPelanggan}`,
              id_pelanggan: idPelanggan,
              bulan: 'Februari 2026',
              nominal,
              status: InvoiceStatus.LUNAS,
              penerima: 'Admin DLH',
            }),
          );

          overallSeq++;
          kelSeq++;
        }
      }
    }
  }

  // Insert batching
  for (let i = 0; i < pelangganList.length; i += 100) {
    const batch = pelangganList.slice(i, i + 100);
    await pelangganRepo.insert(batch);
  }
  console.log(`[Seeder] Inserted ${pelangganList.length} Pelanggan records`);

  for (let i = 0; i < invoiceList.length; i += 100) {
    const batch = invoiceList.slice(i, i + 100);
    await invoiceRepo.insert(batch);
  }
  console.log(`[Seeder] Inserted ${invoiceList.length} Invoice records`);

  console.log('--- FRESH DATABASE SEEDING COMPLETED SUCCESSFULLY ---');
}
