import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pelanggan } from './entities/pelanggan.entity';
import { Invoice } from './entities/invoice.entity';
import { Pembayaran } from './entities/pembayaran.entity';
import { Tarif } from './entities/tarif.entity';
import { Wilayah } from './entities/wilayah.entity';
import { User } from './entities/user.entity';
import { Pengaturan } from './entities/pengaturan.entity';
import { AuthModule } from './modules/auth/auth.module';
import { PelangganModule } from './modules/pelanggan/pelanggan.module';
import { TagihanModule } from './modules/tagihan/tagihan.module';
import { PembayaranModule } from './modules/pembayaran/pembayaran.module';
import { TarifModule } from './modules/tarif/tarif.module';
import { UserModule } from './modules/user/user.module';
import { WilayahModule } from './modules/wilayah/wilayah.module';
import { PengaturanModule } from './modules/pengaturan/pengaturan.module';
import { SnapPaymentModule } from './modules/snap-payment/snap-payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DB_HOST') || 'localhost',
        port: configService.get<number>('DB_PORT') || 3306,
        username: configService.get<string>('DB_USER') || 'root',
        password: configService.get<string>('DB_PASS') || '',
        database: configService.get<string>('DB_NAME') || 'erestribusi_db',
        entities: [Pelanggan, Invoice, Pembayaran, Tarif, Wilayah, User, Pengaturan],
        synchronize: configService.get<string>('DB_SYNCHRONIZE') === 'true',
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    PelangganModule,
    TagihanModule,
    PembayaranModule,
    TarifModule,
    UserModule,
    WilayahModule,
    PengaturanModule,
    SnapPaymentModule,
  ],
})
export class AppModule {}
