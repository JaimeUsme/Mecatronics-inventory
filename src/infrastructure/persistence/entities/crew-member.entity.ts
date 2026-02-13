/**
 * CrewMember Entity
 *
 * Relación entre una cuadrilla y un técnico (empleado de Wispro).
 * No replicamos todos los datos del técnico, solo su ID de Wispro,
 * que se usa para cruzar con el endpoint de empleados cuando sea necesario.
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
import { Crew } from './crew.entity';

@Entity('crew_members')
@Index(['crewId'])
@Index(['technicianId'])
export class CrewMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  crewId: string;

  /**
   * ID del técnico en Wispro (employee_id).
   */
  @Column({ type: 'varchar', length: 255 })
  technicianId: string;

  /**
   * Rol dentro de la cuadrilla (opcional).
   * Ej: 'LEADER', 'HELPER'
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  role: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ManyToOne(() => Crew, (crew) => crew.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'crewId' })
  crew: Crew;
}



