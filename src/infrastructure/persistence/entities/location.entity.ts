/**
 * Location Entity
 * 
 * Representa una ubicación física o lógica donde se almacenan materiales.
 * Puede ser una bodega central o el inventario de un técnico.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
  Unique,
} from 'typeorm';
import { LocationType } from '@domain/enums';
import { Inventory } from './inventory.entity';
import { InventoryMovement } from './inventory-movement.entity';

@Entity('locations')
@Index(['type', 'referenceId']) // Índice compuesto para búsquedas eficientes
@Unique(['type', 'referenceId']) // Constraint único: no puede haber dos ubicaciones del mismo tipo con el mismo referenceId
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: LocationType,
  })
  type: LocationType;

  /**
   * ID de referencia externa.
   * - Si type = WAREHOUSE: null (solo hay una bodega)
   * - Si type = TECHNICIAN: technician_id de Wispro
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  referenceId: string | null;

  @Column({ type: 'varchar', length: 255 })
  name: string; // Ej: "Bodega Central", "Inventario de Juan Pérez"

  @Column({ type: 'boolean', default: true })
  active: boolean; // Indica si la ubicación está activa (útil para desactivar cuadrillas)

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  // Relaciones
  @OneToMany(() => Inventory, (inventory) => inventory.location)
  inventories: Inventory[];

  @OneToMany(() => InventoryMovement, (movement) => movement.fromLocation)
  movementsFrom: InventoryMovement[];

  @OneToMany(() => InventoryMovement, (movement) => movement.toLocation)
  movementsTo: InventoryMovement[];
}

