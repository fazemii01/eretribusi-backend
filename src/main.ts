import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import { seedInitialData } from './database/seed-data';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Enable CORS for frontend connection

  try {
    const dataSource = app.get(DataSource);
    await seedInitialData(dataSource);
  } catch (err) {
    console.error('Seeder error details:', err);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
}
bootstrap();
