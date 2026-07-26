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

  // 5. Data Pelanggan (Mass Seeding 1,000+ Records Across 7 Kelurahan)
  const pelangganRepo = dataSource.getRepository(Pelanggan);
  const pelangganCount = await pelangganRepo.count();

  if (pelangganCount < 10) {
    console.log('Seeding 1,050 Data Pelanggan for all 7 Kelurahan...');

    const kelMap = [
      { kode: 'JGY', nama: 'Jogoyudan', street: 'Jl. Mawar' },
      { kode: 'JGT', nama: 'Jogotrunan', street: 'Jl. Melati' },
      { kode: 'RGT', nama: 'Rogotrunan', street: 'Jl. Dahlia' },
      { kode: 'CTR', nama: 'Citrodiwangsan', street: 'Jl. Gajah Mada' },
      { kode: 'TMP', nama: 'Tompokersan', street: 'Jl. Ahmad Yani' },
      { kode: 'KPH', nama: 'Kepuharjo', street: 'Jl. HOS Cokroaminoto' },
      { kode: 'DTR', nama: 'Ditotrunan', street: 'Jl. Veteran' },
    ];

    const sampleFirstNames = ['Budi', 'Siti', 'Agus', 'Dewi', 'Eko', 'Rina', 'Joko', 'Sri', 'Bambang', 'Heni', 'Hadi', 'Lilis', 'Dedi', 'Yuni', 'Supardi', 'Neneng', 'Slamet', 'Titin'];
    const sampleLastNames = ['Santoso', 'Aminah', 'Setiawan', 'Lestari', 'Prasetyo', 'Wati', 'Susilo', 'Rahayu', 'Hidayat', 'Mulyani', 'Kusuma', 'Utami', 'Firmansyah', 'Suryani'];
    const vaOptions = [450, 900, 1300, 2200];

    const pelangganList: Pelanggan[] = [];
    const invoiceList: Invoice[] = [];

    let totalSeq = 1;

    for (const kel of kelMap) {
      for (let rw = 1; rw <= 5; rw++) {
        for (let rt = 1; rt <= 6; rt++) {
          for (let count = 1; count <= 5; count++) {
            const rtStr = rt.toString().padStart(2, '0');
            const rwStr = rw.toString().padStart(2, '0');
            const seqStr = totalSeq.toString().padStart(3, '0');
            const idPelanggan = `${kel.kode}${rwStr}${rtStr}${seqStr}`;

            const fn = sampleFirstNames[(totalSeq * 3) % sampleFirstNames.length];
            const ln = sampleLastNames[(totalSeq * 7) % sampleLastNames.length];
            const nama = `${fn} ${ln}`;
            const va = vaOptions[totalSeq % vaOptions.length];

            const p = pelangganRepo.create({
              id_pelanggan: idPelanggan,
              nama,
              alamat: `${kel.street} No. ${count * 3}`,
              rt: rtStr,
              rw: rwStr,
              kelurahan: kel.nama,
              kecamatan: 'Lumajang',
              va,
            });

            pelangganList.push(p);

            // Generate Invoices for Maret 2026 and Februari 2026
            const nominalMap: Record<number, number> = { 450: 10000, 900: 15000, 1300: 25000, 2200: 35000 };
            const nominal = nominalMap[va] || 15000;

            const invMaret = invoiceList.push(
              dataSource.getRepository(Invoice).create({
                id_invoice: `INV-2603-${idPelanggan}`,
                id_pelanggan: idPelanggan,
                bulan: 'Maret 2026',
                nominal,
                status: totalSeq % 3 === 0 ? InvoiceStatus.LUNAS : InvoiceStatus.BELUM_LUNAS,
                penerima: totalSeq % 3 === 0 ? 'Admin DLH' : '-',
              }),
            );

            const invFebruari = invoiceList.push(
              dataSource.getRepository(Invoice).create({
                id_invoice: `INV-2602-${idPelanggan}`,
                id_pelanggan: idPelanggan,
                bulan: 'Februari 2026',
                nominal,
                status: InvoiceStatus.LUNAS,
                penerima: 'Admin DLH',
              }),
            );

            totalSeq++;
          }
        }
      }
    }

    // Save in batches of 200
    for (let i = 0; i < pelangganList.length; i += 200) {
      await pelangganRepo.save(pelangganList.slice(i, i + 200));
    }
    for (let i = 0; i < invoiceList.length; i += 200) {
      await dataSource.getRepository(Invoice).save(invoiceList.slice(i, i + 200));
    }

    console.log(`Seeded ${pelangganList.length} Pelanggan & ${invoiceList.length} Invoices successfully!`);
  }
}
