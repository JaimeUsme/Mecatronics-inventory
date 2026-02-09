/**
 * Database Module
 * 
 * Configuración de TypeORM para la conexión a la base de datos.
 * 
 * IMPORTANTE: Para usar este módulo, necesitas instalar:
 * npm install @nestjs/typeorm typeorm mysql2
 * 
 * Variables de entorno requeridas (definidas en .env):
 * - DB_HOST
 * - DB_PORT
 * - DB_USERNAME
 * - DB_PASSWORD
 * - DB_DATABASE
 * - NODE_ENV
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Material,
  Location,
  Inventory,
  InventoryMovement,
  ServiceOrderMaterial,
  InternalUser,
  Crew,
  CrewMember,
  OrderCrewSnapshot,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbSslRaw = configService.get<string>('DB_SSL', 'false');
        const useDbSsl = ['true', '1', 'yes'].includes(dbSslRaw.toLowerCase());

        return {
          type: 'mysql',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 3306),
          username: configService.get<string>('DB_USERNAME', 'root'),
          password: configService.get<string>('DB_PASSWORD', ''),
          database: configService.get<string>('DB_DATABASE', 'Inventory'),
          ssl: useDbSsl ? { rejectUnauthorized: false } : undefined,
          entities: [
          Material,
          Location,
          Inventory,
          InventoryMovement,
          ServiceOrderMaterial,
          InternalUser,
          Crew,
          CrewMember,
          OrderCrewSnapshot,
          ],
          synchronize: false, // Desactivado: usar migraciones SQL manuales
          logging: configService.get<string>('NODE_ENV') === 'development',
          migrations: ['dist/infrastructure/persistence/migrations/*.js'],
          migrationsRun: false,
        };
      },
    }),
    TypeOrmModule.forFeature([
      Material,
      Location,
      Inventory,
      InventoryMovement,
      ServiceOrderMaterial,
      InternalUser,
      Crew,
      CrewMember,
      OrderCrewSnapshot,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

