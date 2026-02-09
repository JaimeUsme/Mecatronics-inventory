/**
 * Inventory Module
 * 
 * Módulo de aplicación que agrupa servicios, controladores y casos de uso
 * relacionados con el sistema de inventario.
 */
import { Module } from '@nestjs/common';
import { InventoryModule as InventoryServiceModule } from '@application/services/inventory';
import { InventoryController } from '@presentation/controllers/inventory/inventory.controller';
import { UsersModule } from '@application/modules/users/users.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [InventoryServiceModule, UsersModule, StorageModule],
  controllers: [InventoryController],
  exports: [InventoryServiceModule],
})
export class InventoryModule {}

