/**
 * Crews Module
 * 
 * Módulo que agrupa los servicios relacionados con cuadrillas.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Crew, CrewMember, Location, Inventory, InventoryMovement, Material } from '@infrastructure/persistence/entities';
import { CrewsService } from './crews.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Crew, CrewMember, Location, Inventory, InventoryMovement, Material]),
  ],
  providers: [CrewsService],
  exports: [CrewsService],
})
export class CrewsModule {}

