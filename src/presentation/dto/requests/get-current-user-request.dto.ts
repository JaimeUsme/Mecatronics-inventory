/**
 * Get Current User Request DTO
 * 
 * DTO que define los datos de autenticación necesarios para obtener
 * la información del usuario actual desde la API de Wispro.
 */
export class GetCurrentUserRequestDto {
  /**
   * Token CSRF obtenido del proceso de login
   * @example 'xyz789...'
   */
  csrfToken: string;

  /**
   * Valor de la cookie _wispro_session_v2 obtenida del proceso de login
   * @example 'ABC123...'
   */
  _wispro_session_v2: string;
}

