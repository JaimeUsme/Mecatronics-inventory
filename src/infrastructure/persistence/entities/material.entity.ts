/**
 * Material Entity
 * 
 * Representa un material/insumo que puede ser almacenado y consumido.
 * Ejemplos: cables, conectores, módems, etc.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { MaterialOwnershipType } from '@domain/enums';
import { Inventory } from './inventory.entity';
import { InventoryMovement } from './inventory-movement.entity';
import { ServiceOrderMaterial } from './service-order-material.entity';

@Entity('materials')
@Index(['name']) // Índice para búsquedas por nombre
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  unit: string; // Ej: "unidad", "metro", "kg", "litro"

  /**
   * Stock mínimo recomendado para este material.
   * Si el inventario baja de este valor, se puede generar una alerta.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  minStock: number;

  /**
   * Categoría del material (ej: CABLES, CONECTORES, EQUIPOS, HERRAMIENTAS, etc.)
   */
  @Column({ type: 'varchar', length: 100, default: 'GENERAL' })
  category: string;

  /**
   * Tipo de propiedad del material.
   * Define a qué nivel se controla el stock principal:
   * - TECHNICIAN: stock por técnico individual
   * - CREW: stock por cuadrilla (material compartido, ej: cables en rollo)
   */
  @Column({
    type: 'enum',
    enum: MaterialOwnershipType,
    default: MaterialOwnershipType.TECHNICIAN,
  })
  ownershipType: MaterialOwnershipType;

  /**
   * Lista de rutas/URLs de imágenes asociadas al material.
   * Se almacena como JSON en la base de datos.
   */
  @Column({ type: 'json', nullable: true })
  images?: string[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  /**
   * Fecha de eliminación (borrado lógico).
   * Si es null, el material está activo.
   */
  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date | null;

  // Relaciones
  @OneToMany(() => Inventory, (inventory) => inventory.material)
  inventories: Inventory[];

  @OneToMany(() => InventoryMovement, (movement) => movement.material)
  movements: InventoryMovement[];

  @OneToMany(() => ServiceOrderMaterial, (serviceOrderMaterial) => serviceOrderMaterial.material)
  serviceOrderMaterials: ServiceOrderMaterial[];
}

