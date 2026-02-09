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
  
  // Habilitar CORS
  app.enableCors({
    origin: true, // Permite todos los orígenes (en producción, especifica los orígenes permitidos)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true, // Permite enviar cookies y headers de autenticación
  });
  
  await app.listen(3000);
  console.log('Application is running on: http://localhost:3000');
}
bootstrap();

