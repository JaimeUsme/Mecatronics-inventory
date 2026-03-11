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
   * Job position or role within the organization (optional).
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  position?: string | null;

  /**
   * Identity document number (optional).
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  documentNumber?: string | null;

  /**
   * Identity document type (optional).
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  documentType?: string | null;

  /**
   * Indica si el usuario está activo.
   * Los usuarios inactivos no pueden hacer login.
   */
  @Column({ type: 'boolean', default: true })
  active: boolean;

  /**
   * Cookie de sesión de Wispro almacenada en DB.
   * El worker la mantiene actualizada automáticamente.
   */
  @Column({ type: 'text', nullable: true })
  wisproSessionCookie?: string | null;

  /**
   * Fecha de expiración de la sesión de Wispro.
   * Derivada del campo expires del Set-Cookie de Wispro.
   */
  @Column({ type: 'timestamp', nullable: true })
  wisproSessionExpires?: Date | null;

  /**
   * CSRF token de Wispro almacenado en DB.
   * El worker lo mantiene actualizado junto con la cookie de sesión.
   */
  @Column({ type: 'varchar', length: 512, nullable: true })
  wisproApiCsrfToken?: string | null;
}


