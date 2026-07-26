import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Wilayah } from '../entities/wilayah.entity';
import { Tarif } from '../entities/tarif.entity';
import { User, UserRole } from '../entities/user.entity';
import { Pengaturan } from '../entities/pengaturan.entity';
import { Pelanggan } from '../entities/pelanggan.entity';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';

export async function seedInitialData(dataSource: DataSource) {
  console.log('Seeding initial data...');

  // 1. Master Wilayah
  const wilayahRepo = dataSource.getRepository(Wilayah);
  const wilayahCount = await wilayahRepo.count();
  if (wilayahCount === 0) {
    const list = [
      { kecamatan: 'Lumajang', kelurahan: 'Jogoyudan', kode_kel: 'JGY' },
      { kecamatan: 'Lumajang', kelurahan: 'Jogotrunan', kode_kel: 'JGT' },
      { kecamatan: 'Lumajang', kelurahan: 'Rogotrunan', kode_kel: 'RGT' },
      { kecamatan: 'Lumajang', kelurahan: 'Citrodiwangsan', kode_kel: 'CTR' },
      { kecamatan: 'Lumajang', kelurahan: 'Tompokersan', kode_kel: 'TMP' },
      { kecamatan: 'Lumajang', kelurahan: 'Kepuharjo', kode_kel: 'KPH' },
      { kecamatan: 'Lumajang', kelurahan: 'Ditotrunan', kode_kel: 'DTR' },
    ];
    await wilayahRepo.save(list);
    console.log('Seeded 7 Master Wilayah');
  }

  // 2. Master Tarif
  const tarifRepo = dataSource.getRepository(Tarif);
  const tarifCount = await tarifRepo.count();
  if (tarifCount === 0) {
    const list = [
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
    await tarifRepo.save(list);
    console.log(`Seeded ${list.length} Master Tarif categories`);
  }

  // 3. User Admin
  const userRepo = dataSource.getRepository(User);
  const userCount = await userRepo.count();
  if (userCount === 0) {
    const passKetua = await bcrypt.hash('ketua123', 10);
    const passAdmin = await bcrypt.hash('admin123', 10);
    const passPetugas = await bcrypt.hash('petugas123', 10);

    await userRepo.save([
      { username: 'ketua', password: passKetua, nama_lengkap: 'Drs. H. Hendra Wijaya', role: UserRole.KETUA },
      { username: 'admin', password: passAdmin, nama_lengkap: 'Budi Santoso, S.E.', role: UserRole.ADMIN },
      { username: 'petugas', password: passPetugas, nama_lengkap: 'Ahmad Fauzi', role: UserRole.PETUGAS },
    ]);
    console.log('Seeded Initial Users (ketua, admin, petugas)');
  }

  // 4. Data Pengaturan
  const pengaturanRepo = dataSource.getRepository(Pengaturan);
  const pCount = await pengaturanRepo.count();
  if (pCount === 0) {
    await pengaturanRepo.save({
      id: 1,
      no_rekening: 'BANK JATIM - 1061001847',
      atas_nama: 'Bendahara Penerimaan DLH',
      link_qris: 'https://drive.google.com/file/d/1AIPSf_QPlWT7nYX699LVMuHZiESs464N/view?usp=drivesdk',
      no_wa_admin: '6281234567890',
    });
    console.log('Seeded Data Pengaturan');
  }

  // 5. Data Pelanggan (Mass Seeding 1,050 Records Across 7 Kelurahan)
  const pelangganRepo = dataSource.getRepository(Pelanggan);
  const oldFormatCount = await pelangganRepo
    .createQueryBuilder('p')
    .where('p.id_pelanggan NOT LIKE :prefix', { prefix: 'LMJ-%' })
    .getCount();
  const totalCount = await pelangganRepo.count();
  const invoiceCount = await dataSource.getRepository(Invoice).count();

  const isNeedsSeeding = oldFormatCount > 0 || totalCount < 1000 || invoiceCount === 0;

  if (isNeedsSeeding) {
    console.log(`Clearing database and re-seeding full 1,050 records with invoices...`);
    try {
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
      await dataSource.query('DELETE FROM data_pembayaran');
      await dataSource.query('DELETE FROM data_invoice');
      await dataSource.query('DELETE FROM data_pelanggan');
      await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (err) {
      try {
        await dataSource.query('TRUNCATE TABLE data_pembayaran, data_invoice, data_pelanggan CASCADE');
      } catch (e) {
        await dataSource.query('DELETE FROM data_invoice');
        await dataSource.query('DELETE FROM data_pelanggan');
      }
    }
    console.log('Seeding 1,050 Data Pelanggan in LMJ-{KEL}-{SEQ} format...');

    const kelurahanList = [
      { code: 'JGY', nama: 'Jogoyudan' },
      { code: 'JGT', nama: 'Jogotrunan' },
      { code: 'RGT', nama: 'Rogotrunan' },
      { code: 'CTR', nama: 'Citrodiwangsan' },
      { code: 'TMP', nama: 'Tompokersan' },
      { code: 'KPH', nama: 'Kepuharjo' },
      { code: 'DTR', nama: 'Ditotrunan' },
    ];
    const streetNames = ['Jl. Trunojoyo', 'Jl. Ahmad Yani', 'Jl. Gajah Mada', 'Jl. Diponegoro', 'Jl. Veteran', 'Jl. Sukarno Hatta', 'Jl. Pahlawan'];
    const sampleNames = ['Budi Santoso', 'Siti Aminah', 'Agus Setiawan', 'Rina Wijaya', 'Eko Prasetyo', 'Hendra Kusuma', 'Dewi Lestari', 'Bambang Utomo', 'Sri Wahyuni', 'Dedi Supriadi'];

    const pelangganList: Pelanggan[] = [];
    const invoiceList: Invoice[] = [];
    let overallSeq = 1;

    for (const kel of kelurahanList) {
      let kelSeq = 1;
      for (let rwNum = 1; rwNum <= 7; rwNum++) {
        for (let rtNum = 1; rtNum <= 5; rtNum++) {
          for (let c = 1; c <= 6; c++) {
            const seqStr = ('000' + kelSeq).slice(-4);
            const idPelanggan = `LMJ-${kel.code}-${seqStr}`;
            const nama = `${sampleNames[(overallSeq - 1) % sampleNames.length]} (${overallSeq})`;
            const street = streetNames[(overallSeq - 1) % streetNames.length];
            const rt = ('0' + rtNum).slice(-2);
            const rw = ('0' + rwNum).slice(-2);
            const va = [450, 900, 1300, 2200][(overallSeq - 1) % 4];

            const p = pelangganRepo.create({
              id_pelanggan: idPelanggan,
              nama,
              alamat: `${street} No. ${(c * 3) + rwNum}`,
              rt,
              rw,
              kelurahan: kel.nama,
              kecamatan: 'Lumajang',
              va,
              no_hp: `6281234${('00000' + overallSeq).slice(-5)}`,
            });
            pelangganList.push(p);

            const nominalMap: Record<number, number> = { 450: 10000, 900: 15000, 1300: 25000, 2200: 35000 };
            const nominal = nominalMap[va] || 15000;

            invoiceList.push(
              dataSource.getRepository(Invoice).create({
                id_invoice: `INV-2603-${idPelanggan}`,
                id_pelanggan: idPelanggan,
                bulan: 'Maret 2026',
                nominal,
                status: overallSeq % 3 === 0 ? InvoiceStatus.LUNAS : InvoiceStatus.BELUM_LUNAS,
                penerima: overallSeq % 3 === 0 ? 'Admin DLH' : '-',
              }),
            );

            invoiceList.push(
              dataSource.getRepository(Invoice).create({
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

    console.log(`Prepared ${pelangganList.length} Pelanggan records to insert...`);

    // Insert in batches of 100 with individual batch error logging
    for (let i = 0; i < pelangganList.length; i += 100) {
      const batch = pelangganList.slice(i, i + 100);
      try {
        await pelangganRepo.insert(batch);
      } catch (err) {
        console.error(`Error inserting Pelanggan batch at index ${i}:`, err.message || err);
      }
    }

    for (let i = 0; i < invoiceList.length; i += 100) {
      const batch = invoiceList.slice(i, i + 100);
      try {
        await dataSource.getRepository(Invoice).insert(batch);
      } catch (err) {
        console.error(`Error inserting Invoice batch at index ${i}:`, err.message || err);
      }
    }

    const finalCount = await pelangganRepo.count();
    console.log(`Seeding complete. Total Pelanggan in database: ${finalCount}`);
  }
}
