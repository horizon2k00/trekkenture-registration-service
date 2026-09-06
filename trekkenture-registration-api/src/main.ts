import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  if (!corsOrigin) {
    throw new Error('CORS_ORIGIN is required');
  }

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

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
