/**
 * Inventory Module
 * 
 * Módulo que agrupa los servicios y casos de uso relacionados con inventario.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Material,
  Location,
  Inventory,
  InventoryMovement,
  ServiceOrderMaterial,
  CrewMember,
} from '@infrastructure/persistence/entities';
import { InventoryService } from './inventory.service';
import { OrderCrewSnapshotModule } from '../orders/order-crew-snapshot.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Material,
      Location,
      Inventory,
      InventoryMovement,
      ServiceOrderMaterial,
      CrewMember,
    ]),
    OrderCrewSnapshotModule,
  ],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

