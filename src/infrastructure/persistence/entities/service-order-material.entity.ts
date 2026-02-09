/**
 * Service Order Material Entity
 * 
 * Registra los materiales consumidos en una orden de servicio específica.
 * Esta tabla permite consultar qué materiales se usaron en cada orden.
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
import { ConsumptionType } from '@domain/enums';
import { Material } from './material.entity';

@Entity('service_order_materials')
@Index(['serviceOrderId']) // Índice para consultas por orden
@Index(['technicianId']) // Índice para consultas por técnico
@Index(['materialId']) // Índice para consultas por material
export class ServiceOrderMaterial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  serviceOrderId: string; // ID de la orden de servicio (puede venir de Wispro)

  @Column({ type: 'uuid' })
  materialId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantityUsed: number;

  @Column({ type: 'varchar', length: 255 })
  technicianId: string; // ID del técnico que registró el consumo

  @Column({
    type: 'enum',
    enum: ConsumptionType,
    default: ConsumptionType.USED,
  })
  consumptionType: ConsumptionType; // Tipo de consumo: USED (usado/gastado) o DAMAGED (dañado)

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  // Relaciones
  @ManyToOne(() => Material, (material) => material.serviceOrderMaterials, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'materialId' })
  material: Material;
}

