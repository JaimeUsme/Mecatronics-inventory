/**
 * Inventory Movement Entity
 * 
 * Registra TODOS los movimientos de inventario (histórico completo).
 * Cada cambio de stock debe crear un registro aquí.
 * 
 * Tipos de movimiento:
 * - TRANSFER: Transferencia entre ubicaciones (ej: bodega -> técnico)
 * - CONSUMPTION: Consumo de material en una orden de servicio
 * - ADJUSTMENT: Ajuste manual (inventarios físicos, correcciones)
 * - DAMAGED: Material dañado durante transferencia o consumo
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { MovementType } from '@domain/enums';
import { Material } from './material.entity';
import { Location } from './location.entity';

@Entity('inventory_movements')
@Index(['materialId']) // Índice para consultas por material
@Index(['fromLocationId']) // Índice para consultas por origen
@Index(['toLocationId']) // Índice para consultas por destino
@Index(['type']) // Índice para filtrar por tipo de movimiento
@Index(['createdAt']) // Índice para consultas temporales
@Index(['serviceOrderId']) // Índice para consultas por orden de servicio
@Index(['technicianId']) // Índice para consultas por técnico
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  materialId: string;

  /**
   * Ubicación de origen (nullable para ajustes y consumos iniciales)
   * - TRANSFER: desde dónde se transfiere
   * - CONSUMPTION: ubicación del técnico/cuadrilla de donde se consume
   * - ADJUSTMENT: ubicación ajustada
   * - DAMAGED: ubicación de origen (donde se dañó el material)
   */
  @Column({ type: 'uuid', nullable: true })
  fromLocationId: string | null;

  /**
   * Ubicación de destino (nullable para consumos y daños)
   * - TRANSFER: hacia dónde se transfiere
   * - CONSUMPTION: null (se consume, no va a ningún lado)
   * - ADJUSTMENT: ubicación ajustada
   * - DAMAGED: null (material dañado no llega a ningún destino)
   */
  @Column({ type: 'uuid', nullable: true })
  toLocationId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number; // Cantidad positiva (el signo se determina por el tipo)

  @Column({
    type: 'enum',
    enum: MovementType,
  })
  type: MovementType;

  /**
   * ID de la orden de servicio relacionada (para CONSUMPTION y DAMAGED de consumo)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  serviceOrderId: string | null;

  /**
   * ID del técnico relacionado (para CONSUMPTION, DAMAGED y TRANSFER a técnico)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  technicianId: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  // Relaciones
  @ManyToOne(() => Material, (material) => material.movements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'materialId' })
  material: Material;

  @ManyToOne(() => Location, (location) => location.movementsFrom, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fromLocationId' })
  fromLocation: Location | null;

  @ManyToOne(() => Location, (location) => location.movementsTo, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'toLocationId' })
  toLocation: Location | null;
}

