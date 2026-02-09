/**
 * Internal User DTO
 *
 * Respuesta para usuario interno (sin exponer password).
 */
export class InternalUserDto {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}


