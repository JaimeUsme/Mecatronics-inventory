/**
 * Login Request DTO
 * 
 * DTO que define la estructura del request para el endpoint de login.
 * Contiene las credenciales necesarias para autenticarse en Wispro.
 */
export class LoginRequestDto {
  /**
   * Email del usuario para autenticación en Wispro
   * @example 'usuario@example.com'
   */
  email: string;

  /**
   * Contraseña del usuario para autenticación en Wispro
   * @example 'miPassword123'
   */
  password: string;
}

