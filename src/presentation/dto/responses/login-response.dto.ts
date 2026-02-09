/**
 * Login Response DTO
 * 
 * DTO que define la estructura de la respuesta del endpoint de login.
 * Contiene el JWT token encriptado y desencriptado para verificación.
 */
export class LoginResponseDto {
  /**
   * JWT token encriptado que contiene las credenciales de Wispro (csrfToken y sessionCookie)
   * Este token debe enviarse en el header Authorization: Bearer <token>
   */
  accessToken: string;

  /**
   * JWT token desencriptado (payload) para verificación
   */
  jwtDecrypted: {
    sub: string;
    csrfToken: string;
    sessionCookie: string;
    iat?: number;
    exp?: number;
  };
}

