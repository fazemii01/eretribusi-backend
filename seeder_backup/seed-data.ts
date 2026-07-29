import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { Wilayah } from '../src/entities/wilayah.entity';
import { Tarif } from '../src/entities/tarif.entity';
import { User, UserRole } from '../src/entities/user.entity';
import { Pengaturan } from '../src/entities/pengaturan.entity';
import { Pelanggan } from '../src/entities/pelanggan.entity';
import { Invoice, InvoiceStatus } from '../src/entities/invoice.entity';
import { Pembayaran } from '../src/entities/pembayaran.entity';

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

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === ';') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function findCSVFile(keyword: string): string | null {
  const folders = [
    path.resolve(process.cwd(), '../contoh/data'),
    path.resolve(process.cwd(), '../contoh'),
    path.resolve(process.cwd(), 'contoh/data'),
    path.resolve(process.cwd(), 'contoh'),
    path.resolve(__dirname, '../../contoh/data'),
    path.resolve(__dirname, '../../contoh'),
  ];

  for (const folder of folders) {
    if (fs.existsSync(folder)) {
      try {
        const files = fs.readdirSync(folder);
        const matched = files.find(
          (file) => file.toLowerCase().endsWith('.csv') && file.toLowerCase().includes(keyword.toLowerCase()),
        );
        if (matched) {
          return path.join(folder, matched);
        }
      } catch (e) {
        // ignore
      }
    }
  }
  return null;
}

function loadWilayahFromCSV(wilayahRepo: any): Wilayah[] {
  const csvPath = findCSVFile('wilayah');
  const list: Wilayah[] = [];
  const defaultList = [
    { kecamatan: 'Lumajang', kelurahan: 'Jogoyudan', kode_kel: 'JGY' },
    { kecamatan: 'Lumajang', kelurahan: 'Jogotrunan', kode_kel: 'JGT' },
    { kecamatan: 'Lumajang', kelurahan: 'Rogotrunan', kode_kel: 'RGT' },
    { kecamatan: 'Lumajang', kelurahan: 'Citrodiwangsan', kode_kel: 'CTR' },
    { kecamatan: 'Lumajang', kelurahan: 'Tompokersan', kode_kel: 'TMP' },
    { kecamatan: 'Lumajang', kelurahan: 'Kepuharjo', kode_kel: 'KPH' },
    { kecamatan: 'Lumajang', kelurahan: 'Ditotrunan', kode_kel: 'DTR' },
  ];

  if (csvPath) {
    try {
      console.log(`[Seeder] Parsing Wilayah CSV: ${csvPath}`);
      const content = fs.readFileSync(csvPath, 'utf-8').trim();
      const lines = content.split(/\r?\n/);
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = parseCSVLine(line);
        if (cols.length >= 2) {
          const kec = cols[0] || 'Lumajang';
          const kel = cols[1];
          const singk = cols[2] || '';
          const kode_kel = singk.includes('-') ? singk.split('-')[1] : singk || kel.slice(0, 3).toUpperCase();

          list.push(
            wilayahRepo.create({
              kecamatan: kec,
              kelurahan: kel,
              kode_kel,
            }),
          );
        }
      }
    } catch (err) {
      console.warn('[Seeder] Error parsing Wilayah CSV:', err);
    }
  }

  if (list.length === 0) {
    for (const item of defaultList) {
      list.push(wilayahRepo.create(item));
    }
  }
  return list;
}

function loadTarifFromCSV(tarifRepo: any): Tarif[] {
  const csvPath = findCSVFile('tarif');
  const list: Tarif[] = [];
  const seenVA = new Set<number>();
  let customSeq = 90001;

  if (csvPath) {
    try {
      console.log(`[Seeder] Parsing Tarif CSV: ${csvPath}`);
      const content = fs.readFileSync(csvPath, 'utf-8').trim();
      const lines = content.split(/\r?\n/);
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = parseCSVLine(line);
        if (cols.length >= 2) {
          const vaRaw = cols[0];
          const tarifRaw = cols[1];
          if (!vaRaw) continue;

          const isPureNumeric = /^\d+$/.test(vaRaw.trim());
          let vaNum: number;
          let nama_tarif: string;

          if (isPureNumeric) {
            vaNum = parseInt(vaRaw.trim());
            nama_tarif = `Tarif ${vaNum} VA`;
          } else {
            vaNum = customSeq++;
            nama_tarif = vaRaw.trim();
          }

          const nominalNum = parseInt(tarifRaw.replace(/\D/g, '')) || 0;

          if (!seenVA.has(vaNum)) {
            seenVA.add(vaNum);
            list.push(
              tarifRepo.create({
                va: vaNum,
                nama_tarif,
                nominal: nominalNum,
              }),
            );
          }
        }
      }
    } catch (err) {
      console.warn('[Seeder] Error parsing Tarif CSV:', err);
    }
  }

  if (list.length === 0) {
    const defaultList = [
      { va: 450, nama_tarif: 'Rumah Tangga R1-450VA', nominal: 3000 },
      { va: 900, nama_tarif: 'Rumah Tangga R1-900VA', nominal: 8000 },
      { va: 1300, nama_tarif: 'Rumah Tangga R1-1300VA', nominal: 8000 },
      { va: 2200, nama_tarif: 'Rumah Tangga R1-2200VA', nominal: 8000 },
      { va: 3500, nama_tarif: 'Rumah Tangga R2-3500VA (Mewah)', nominal: 15000 },
      { va: 5500, nama_tarif: 'Komersial / Minimarket (5500VA)', nominal: 15000 },
      { va: 6600, nama_tarif: 'Toko / Ruko Niaga', nominal: 25000 },
    ];
    for (const item of defaultList) {
      list.push(tarifRepo.create(item));
    }
  }
  return list;
}

async function loadUsersFromCSV(userRepo: any): Promise<User[]> {
  const csvPath = findCSVFile('admin');
  const list: User[] = [];

  const passKetua = await bcrypt.hash('ketua123', 10);
  const passAdmin = await bcrypt.hash('admin123', 10);
  const passPetugas = await bcrypt.hash('petugas123', 10);

  if (csvPath) {
    try {
      console.log(`[Seeder] Parsing Admin CSV: ${csvPath}`);
      const content = fs.readFileSync(csvPath, 'utf-8').trim();
      const lines = content.split(/\r?\n/);
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = parseCSVLine(line);
        if (cols.length >= 3) {
          const username = cols[1];
          const rawRole = (cols[3] || 'admin').toLowerCase();
          let role = UserRole.ADMIN;
          let pwdHash = passAdmin;

          if (rawRole.includes('ketua')) {
            role = UserRole.KETUA;
            pwdHash = passKetua;
          } else if (rawRole.includes('petugas')) {
            role = UserRole.PETUGAS;
            pwdHash = passPetugas;
          }

          list.push(
            userRepo.create({
              username,
              password: pwdHash,
              nama_lengkap: username.toUpperCase(),
              role,
            }),
          );
        }
      }
    } catch (err) {
      console.warn('[Seeder] Error parsing Admin CSV:', err);
    }
  }

  const usernames = list.map((u) => u.username);
  if (!usernames.includes('ketua')) {
    list.push(userRepo.create({ username: 'ketua', password: passKetua, nama_lengkap: 'Drs. H. Hendra Wijaya', role: UserRole.KETUA }));
  }
  if (!usernames.includes('admin')) {
    list.push(userRepo.create({ username: 'admin', password: passAdmin, nama_lengkap: 'Budi Santoso, S.E.', role: UserRole.ADMIN }));
  }
  if (!usernames.includes('petugas')) {
    list.push(userRepo.create({ username: 'petugas', password: passPetugas, nama_lengkap: 'Ahmad Fauzi', role: UserRole.PETUGAS }));
  }

  return list;
}

function loadPengaturanFromCSV(pengaturanRepo: any): Pengaturan {
  const csvPath = findCSVFile('pengaturan');
  if (csvPath) {
    try {
      console.log(`[Seeder] Parsing Pengaturan CSV: ${csvPath}`);
      const content = fs.readFileSync(csvPath, 'utf-8').trim();
      const lines = content.split(/\r?\n/);
      if (lines.length >= 2) {
        const values = parseCSVLine(lines[1]);
        return pengaturanRepo.create({
          id: 1,
          no_rekening: values[0] || 'BANK JATIM - 1061001847',
          atas_nama: values[1] || 'Bendahara Penerimaan DLH',
          link_qris: values[2] || 'https://drive.google.com/file/d/1AIPSf_QPlWT7nYX699LVMuHZiESs464N/view?usp=drivesdk',
          no_wa_admin: values[3] || '6281234567890',
        });
      }
    } catch (err) {
      console.warn('[Seeder] Error parsing Pengaturan CSV:', err);
    }
  }

  return pengaturanRepo.create({
    id: 1,
    no_rekening: 'BANK JATIM - 1061001847',
    atas_nama: 'Bendahara Penerimaan DLH',
    link_qris: 'https://drive.google.com/file/d/1AIPSf_QPlWT7nYX699LVMuHZiESs464N/view?usp=drivesdk',
    no_wa_admin: '6281234567890',
  });
}

function loadPelangganFromCSV(
  pelangganRepo: any,
  invoiceRepo: any,
): { pelangganList: Pelanggan[]; invoiceList: Invoice[] } {
  const csvPath = findCSVFile('pelanggan');
  const pelangganList: Pelanggan[] = [];
  const invoiceList: Invoice[] = [];
  const nominalMap: Record<number, number> = { 450: 3000, 900: 8000, 1300: 8000, 2200: 8000, 3500: 15000, 5500: 15000, 6600: 25000 };

  if (csvPath) {
    try {
      console.log(`[Seeder] Parsing Pelanggan CSV file: ${csvPath}...`);
      const content = fs.readFileSync(csvPath, 'utf-8').trim();
      const lines = content.split(/\r?\n/);
      const seenPelangganID = new Set<string>();

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = parseCSVLine(line);

        let idPelanggan = (cols[0] || `LMJ-${i.toString().padStart(5, '0')}`).trim();
        if (idPelanggan.length > 80) {
          idPelanggan = idPelanggan.slice(0, 80);
        }
        if (seenPelangganID.has(idPelanggan)) {
          idPelanggan = `${idPelanggan}-${i}`.slice(0, 95);
        }
        seenPelangganID.add(idPelanggan);

        const nama = (cols[1] || `Warga ${i}`).trim().slice(0, 250);
        const alamat = (cols[2] || 'Jl. Lumajang').trim();
        const kelurahan = (cols[3] || 'Rogotrunan').trim().slice(0, 90);
        const kecamatan = (cols[4] || 'Lumajang').trim().slice(0, 90);
        const vaRaw = cols[5] || '900';
        const va = parseInt(vaRaw.replace(/\D/g, '')) || 900;
        const noHp = (cols[6] || '-').trim().slice(0, 45);

        const rtMatch = line.match(/RT\s*[:.]?\s*(\d+)/i);
        const rwMatch = line.match(/RW\s*[:.]?\s*(\d+)/i);
        const rt = (rtMatch ? rtMatch[1].padStart(2, '0') : '01').slice(0, 40);
        const rw = (rwMatch ? rwMatch[1].padStart(2, '0') : '01').slice(0, 40);

        const p = pelangganRepo.create({
          id_pelanggan: idPelanggan,
          nama,
          alamat,
          rt,
          rw,
          kelurahan,
          kecamatan,
          va,
          no_hp: noHp,
        });
        pelangganList.push(p);

        const nominal = nominalMap[va] || 8000;

        invoiceList.push(
          invoiceRepo.create({
            id_invoice: `INV-2603-${idPelanggan}`,
            id_pelanggan: idPelanggan,
            bulan: 'Maret 2026',
            nominal,
            status: i % 3 === 0 ? InvoiceStatus.LUNAS : InvoiceStatus.BELUM_LUNAS,
            penerima: i % 3 === 0 ? 'Admin DLH' : '-',
          }),
        );

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
      }
      console.log(`[Seeder] Successfully parsed ${pelangganList.length} customer records from CSV!`);
    } catch (err) {
      console.warn('[Seeder] Error parsing Pelanggan CSV:', err);
    }
  }

  return { pelangganList, invoiceList };
}

function loadBayarFromCSV(pembayaranRepo: any): Pembayaran[] {
  const csvPath = findCSVFile('bayar');
  const list: Pembayaran[] = [];

  if (csvPath) {
    try {
      console.log(`[Seeder] Parsing Pembayaran CSV: ${csvPath}`);
      const content = fs.readFileSync(csvPath, 'utf-8').trim();
      const lines = content.split(/\r?\n/);
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = parseCSVLine(line);
        if (cols.length >= 6) {
          list.push(
            pembayaranRepo.create({
              id_kuitansi: cols[0],
              id_invoice: cols[2],
              id_pelanggan: cols[3],
              bulan: cols[4],
              nominal: parseInt(cols[5]) || 8000,
              admin: cols[6] || 'admin',
            }),
          );
        }
      }
    } catch (err) {
      console.warn('[Seeder] Error parsing Pembayaran CSV:', err);
    }
  }

  return list;
}

export async function seedInitialData(dataSource: DataSource) {
  console.log('--- STARTING FRESH COMPLETE DATABASE SEEDER ---');
  console.log(`[Seeder] Excluded sheet names: ${EXCLUDED_SHEETS.join(', ')}`);

  try {
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await dataSource.query('DROP TABLE IF EXISTS data_bayar');
    await dataSource.query('DROP TABLE IF EXISTS data_invoice');
    await dataSource.query('DROP TABLE IF EXISTS data_pelanggan');
    await dataSource.query('DROP TABLE IF EXISTS master_wilayah');
    await dataSource.query('DROP TABLE IF EXISTS master_tarif');
    await dataSource.query('DROP TABLE IF EXISTS data_admin');
    await dataSource.query('DROP TABLE IF EXISTS data_pengaturan');
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('[Seeder] Dropped old database tables for clean initialization');

    await dataSource.synchronize();
    console.log('[Seeder] Synchronized fresh database schema');
  } catch (err) {
    console.warn('[Seeder] Error resetting schema:', err);
  }

  const wilayahRepo = dataSource.getRepository(Wilayah);
  const wilayahList = loadWilayahFromCSV(wilayahRepo);
  if (wilayahList.length > 0) {
    await wilayahRepo.save(wilayahList);
    console.log(`[Seeder] Seeded ${wilayahList.length} Master Wilayah records`);
  }

  const tarifRepo = dataSource.getRepository(Tarif);
  const tarifList = loadTarifFromCSV(tarifRepo);
  if (tarifList.length > 0) {
    await tarifRepo.save(tarifList);
    console.log(`[Seeder] Seeded ${tarifList.length} Master Tarif records`);
  }

  const userRepo = dataSource.getRepository(User);
  const userList = await loadUsersFromCSV(userRepo);
  if (userList.length > 0) {
    await userRepo.save(userList);
    console.log(`[Seeder] Seeded ${userList.length} User Admin records`);
  }

  const pengaturanRepo = dataSource.getRepository(Pengaturan);
  const pengaturanData = loadPengaturanFromCSV(pengaturanRepo);
  await pengaturanRepo.save(pengaturanData);
  console.log('[Seeder] Seeded Data Pengaturan');

  const pelangganRepo = dataSource.getRepository(Pelanggan);
  const invoiceRepo = dataSource.getRepository(Invoice);
  const { pelangganList, invoiceList } = loadPelangganFromCSV(pelangganRepo, invoiceRepo);

  if (pelangganList.length > 0) {
    console.log(`[Seeder] Inserting ${pelangganList.length} Pelanggan records in batches...`);
    for (let i = 0; i < pelangganList.length; i += 500) {
      const batch = pelangganList.slice(i, i + 500);
      await pelangganRepo.insert(batch);
    }
    console.log(`[Seeder] Successfully inserted ${pelangganList.length} Pelanggan records!`);
  }

  if (invoiceList.length > 0) {
    console.log(`[Seeder] Inserting ${invoiceList.length} Invoice records in batches...`);
    for (let i = 0; i < invoiceList.length; i += 500) {
      const batch = invoiceList.slice(i, i + 500);
      await invoiceRepo.insert(batch);
    }
    console.log(`[Seeder] Successfully inserted ${invoiceList.length} Invoice records!`);
  }

  const pembayaranRepo = dataSource.getRepository(Pembayaran);
  const bayarList = loadBayarFromCSV(pembayaranRepo);
  if (bayarList.length > 0) {
    await pembayaranRepo.save(bayarList);
    console.log(`[Seeder] Seeded ${bayarList.length} Pembayaran records`);
  }

  console.log('--- COMPLETE DATABASE SEEDING FINISHED SUCCESSFULLY ---');
}
