/**
 * Internal User Entity
 *
 * Usuario interno del sistema (no depende de Wispro).
 * Se usa para login interno con email y password hasheada.
 */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('internal_users')
@Index(['email'], { unique: true }) // Email único
export class InternalUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  /**
   * Password hasheada con bcrypt
   */
  @Column({ type: 'varchar', length: 255 })
  passwordHash: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  /**
   * Email de la cuenta de Wispro asociada (opcional)
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  wisproEmail?: string | null;

  /**
   * Password de Wispro cifrado simétricamente (NUNCA en texto plano).
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  wisproPasswordEncrypted?: string | null;

  /**
   * Indica si el usuario está activo.
   * Los usuarios inactivos no pueden hacer login.
   */
  @Column({ type: 'boolean', default: true })
  active: boolean;
}


