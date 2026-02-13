/**
 * Crew Entity
 *
 * Representa una cuadrilla de trabajo (equipo de técnicos).
 * Se usa principalmente para:
 * - Agrupar técnicos que comparten materiales de cuadrilla
 * - Asociar una Location de tipo CREW para controlar inventario
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { CrewMember } from './crew-member.entity';

@Entity('crews')
export class Crew {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  /**
   * Técnico líder de la cuadrilla (ID de empleado en Wispro).
   * Se usa para aplicar reglas de negocio relacionadas con responsabilidad
   * sobre el material de cuadrilla.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  leaderTechnicianId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => CrewMember, (member) => member.crew)
  members: CrewMember[];
}



