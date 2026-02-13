/**
 * Internal Login Response DTO
 *
 * Respuesta del login interno con JWT.
 */
import { InternalUserDto } from './internal-user.dto';

export class InternalLoginResponseDto {
  /**
   * JWT para autenticación interna
   */
  accessToken: string;

  /**
   * Información básica del usuario
   */
  user: InternalUserDto;
}



