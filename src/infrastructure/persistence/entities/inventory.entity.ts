/**
 * Inventory Entity
 * 
 * Representa el estado actual del stock de un material en una ubicación específica.
 * Esta tabla mantiene el inventario actualizado (no se calcula on the fly).
 * 
 * IMPORTANTE: Cada cambio de stock debe actualizar esta tabla Y crear un registro
 * en InventoryMovement para mantener el histórico.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Material } from './material.entity';
import { Location } from './location.entity';

@Entity('inventories')
@Unique(['materialId', 'locationId']) // Restricción: un material solo puede tener un registro por ubicación
@Index(['locationId']) // Índice para consultas por ubicación
@Index(['materialId']) // Índice para consultas por material
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  materialId: string;

  @Column({ type: 'uuid' })
  locationId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  stock: number;

  /**
   * Stock mínimo para esta ubicación específica.
   * - Para bodega: valor recomendado de stock mínimo
   * - Para técnicos: null (no aplica stock mínimo)
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minStock: number | null;

  // Relaciones
  @ManyToOne(() => Material, (material) => material.inventories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'materialId' })
  material: Material;

  @ManyToOne(() => Location, (location) => location.inventories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'locationId' })
  location: Location;
}

