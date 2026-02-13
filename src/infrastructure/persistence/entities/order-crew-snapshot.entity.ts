/**
 * Order Crew Snapshot Entity
 *
 * Guarda un snapshot histórico de la cuadrilla asignada a una orden
 * en el momento en que se consultó/creó el snapshot.
 *
 * Esto permite saber quiénes eran los miembros de la cuadrilla
 * cuando se realizó la orden, incluso si la cuadrilla cambió después.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('order_crew_snapshots')
@Index(['orderId'])
@Index(['employeeId'])
@Index(['crewId'])
export class OrderCrewSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * ID de la orden de Wispro
   */
  @Column({ type: 'varchar', length: 255 })
  orderId: string;

  /**
   * ID del empleado asignado a la orden (en Wispro)
   */
  @Column({ type: 'varchar', length: 255 })
  employeeId: string;

  /**
   * ID de la cuadrilla a la que pertenecía el empleado en ese momento
   */
  @Column({ type: 'uuid', nullable: true })
  crewId: string | null;

  /**
   * Nombre de la cuadrilla en ese momento
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  crewName: string | null;

  /**
   * IDs de los miembros de la cuadrilla en ese momento (JSON array)
   * Ejemplo: ["tech-id-1", "tech-id-2", "tech-id-3"]
   */
  @Column({ type: 'json', nullable: true })
  crewMemberIds: string[] | null;

  /**
   * Información adicional de los miembros (JSON array de objetos)
   * Cada objeto contiene: { technicianId, role, name? }
   */
  @Column({ type: 'json', nullable: true })
  crewMembers: Array<{
    technicianId: string;
    role: string | null;
    name?: string;
  }> | null;

  /**
   * Fecha en que se tomó el snapshot
   */
  @CreateDateColumn({ type: 'timestamp' })
  snapshotDate: Date;
}


