import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const rawFrontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const port = configService.get<number>('PORT', 3001);

  // Parse CORS origin: supports single URL or comma-separated URLs
  const corsOrigin = rawFrontendUrl.includes(',')
    ? rawFrontendUrl.split(',').map((url) => url.trim()).filter(Boolean)
    : rawFrontendUrl.trim();

  // CORS — allow the Next.js frontend to communicate with this backend
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global validation pipe — reject payloads that don't match DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Bind to 0.0.0.0 for containerized and cloud platform hosting
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Policy Change Impact Engine backend running on http://0.0.0.0:${port}`);
}

await bootstrap();

