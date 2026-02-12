/**
 * Inventory Module
 * 
 * Módulo de aplicación que agrupa servicios, controladores y casos de uso
 * relacionados con el sistema de inventario.
 */
import { Module } from '@nestjs/common';
import { InventoryModule as InventoryServiceModule } from '@application/services/inventory';
import { InventoryController } from '@presentation/controllers/inventory/inventory.controller';
import { StorageModule } from '../storage/storage.module';
import { AuthenticationModule } from '../authentication/authentication.module';

@Module({
  imports: [InventoryServiceModule, StorageModule, AuthenticationModule],
  controllers: [InventoryController],
  exports: [InventoryServiceModule],
})
export class InventoryModule {}

