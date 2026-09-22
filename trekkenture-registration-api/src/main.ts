import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const rawCorsOrigin = configService.get<string>('CORS_ORIGIN');
  const corsOrigin = rawCorsOrigin?.trim();
  if (!corsOrigin || corsOrigin === '*') {
    // Test deployment: allow any origin. Bearer auth is used (no cookies),
    // so credentials are not needed. `origin: true` reflects the request
    // origin, which is equivalent to `*` without credentials.
    app.enableCors({ origin: true, credentials: false });
  } else {
    // Comma-separated allowlist, e.g. "https://trekkenture.in,http://localhost:3001"
    const origins = corsOrigin
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    app.enableCors({
      origin: origins.length === 1 ? origins[0] : origins,
      credentials: true,
    });
  }

  const httpLogger = new Logger('HTTP');
  app.use((request: Request, response: Response, next: NextFunction) => {
    const startedAt = Date.now();
    response.on('finish', () => {
      httpLogger.log(
        `${request.method} ${request.path} ${response.statusCode} ${Date.now() - startedAt}ms`,
      );
    });
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  new Logger('Bootstrap').log(
    `Application is running on http://localhost:${port}`,
  );
}
bootstrap();
