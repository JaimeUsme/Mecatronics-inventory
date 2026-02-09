/**
 * Main entry point of the NestJS application.
 * This file bootstraps the application and starts the HTTP server.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'], // Habilitar todos los niveles de log
  });
  
  const corsOriginRaw = process.env.CORS_ORIGIN;
  const corsOrigin =
    !corsOriginRaw || corsOriginRaw === '*'
      ? true
      : corsOriginRaw.split(',').map((origin) => origin.trim()).filter(Boolean);

  // Habilitar CORS
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true, // Permite enviar cookies y headers de autenticación
  });
  
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}`);
}
bootstrap();

