/**
 * Root module of the NestJS application.
 * This module imports and configures all feature modules, infrastructure adapters,
 * and shared services following the hexagonal architecture pattern.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { WisproSessionRefreshModule } from './infrastructure/external/wispro/wispro-session-refresh.module';
import {
  AuthenticationModule,
  InternalAuthModule,
  EmployeesModule,
  OrdersModule,
  InventoryModule,
  CrewsModule,
  PlansModule,
  StorageModule,
  MobileModule,
  ClientsModule,
} from './application/modules';
import { DatabaseModule } from './infrastructure/persistence/database.module';
import { SharedModule } from './application/modules/shared/shared.module';

@Module({
  imports: [
    // ConfigModule debe ir primero para que las variables de entorno estén disponibles
    ConfigModule.forRoot({
      isGlobal: true, // Hace que ConfigModule esté disponible en todos los módulos
      envFilePath: '.env', // Ruta al archivo .env
    }),
    ScheduleModule.forRoot(), // Habilita el scheduler para el worker de renovación de sesiones
    DatabaseModule, // Módulo de base de datos (TypeORM) - debe ir después de ConfigModule
    SharedModule, // Módulo compartido con servicios globales e interceptores
    WisproSessionRefreshModule, // Worker que mantiene sesiones Wispro actualizadas en DB
    InternalAuthModule,
    AuthenticationModule,
    EmployeesModule,
    OrdersModule,
    InventoryModule,
    CrewsModule,
    PlansModule,
    StorageModule,
    MobileModule,
    ClientsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

