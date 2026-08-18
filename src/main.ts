import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Global Input Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  // Dynamic CORS Configuration
  const allowedOriginsEnv = process.env.CORS_ALLOWED_ORIGINS;
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'https://dev.dlh.lumajangkab.go.id',
    'https://erestribusi.lumajangkab.go.id',
  ];
  const allowedOrigins = allowedOriginsEnv
    ? allowedOriginsEnv.split(',').map((o) => o.trim())
    : defaultOrigins;

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, true); // Allow during transition but enforce credentials
    },
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
}
bootstrap();

