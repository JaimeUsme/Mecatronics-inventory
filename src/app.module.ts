/**
 * Root module of the NestJS application.
 * This module imports and configures all feature modules, infrastructure adapters,
 * and shared services following the hexagonal architecture pattern.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  AuthenticationModule,
  InternalAuthModule,
  EmployeesModule,
  OrdersModule,
  InventoryModule,
  CrewsModule,
  StorageModule,
  MobileModule,
} from './application/modules';
import { DatabaseModule } from './infrastructure/persistence/database.module';

@Module({
  imports: [
    // ConfigModule debe ir primero para que las variables de entorno estén disponibles
    ConfigModule.forRoot({
      isGlobal: true, // Hace que ConfigModule esté disponible en todos los módulos
      envFilePath: '.env', // Ruta al archivo .env
    }),
    DatabaseModule, // Módulo de base de datos (TypeORM) - debe ir después de ConfigModule
    InternalAuthModule,
    AuthenticationModule,
    EmployeesModule,
    OrdersModule,
    InventoryModule,
    CrewsModule,
    StorageModule,
    MobileModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

