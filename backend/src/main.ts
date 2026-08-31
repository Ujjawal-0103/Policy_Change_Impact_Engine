import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const rawFrontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const port = configService.get<number>('PORT', 3001);

  // Parse CORS origin: supports single URL, comma-separated URLs, and onrender.com subdomains
  const configuredOrigins = rawFrontendUrl.includes(',')
    ? rawFrontendUrl.split(',').map((url) => url.trim().replace(/\/$/, '')).filter(Boolean)
    : [rawFrontendUrl.trim().replace(/\/$/, '')];

  // CORS — allow the Next.js frontend to communicate with this backend
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      
      const normalizedOrigin = origin.replace(/\/$/, '');
      const isAllowed =
        configuredOrigins.includes(normalizedOrigin) ||
        normalizedOrigin.endsWith('.onrender.com') ||
        normalizedOrigin.includes('localhost') ||
        normalizedOrigin.includes('127.0.0.1');

      if (isAllowed) {
        return callback(null, true);
      }
      return callback(null, true);
    },
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

