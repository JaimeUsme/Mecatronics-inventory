/**
 * Internal User DTO
 *
 * Respuesta para usuario interno (sin exponer password).
 */
export class InternalUserDto {
  id: string;
  name: string;
  email: string;
  active: boolean;
  wisproEmail?: string | null;
  createdAt: Date;
  updatedAt: Date;
  /**
   * Indica si este usuario es el usuario actualmente autenticado
   */
  isCurrentUser?: boolean;
}


