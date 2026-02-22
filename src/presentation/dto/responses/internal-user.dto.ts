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
  position?: string | null;
  documentNumber?: string | null;
  wisproEmail?: string | null;
  createdAt: Date;
  updatedAt: Date;
  /**
   * Indica si este usuario es el usuario actualmente autenticado
   */
  isCurrentUser?: boolean;
}

export class ActiveUserBasicInfoDto {
  name: string;
  documentNumber?: string | null;
  position?: string | null;
}


