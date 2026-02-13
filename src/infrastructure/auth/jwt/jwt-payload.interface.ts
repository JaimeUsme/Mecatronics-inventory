/**
 * JWT Payload Interface
 * 
 * Define la estructura del payload del JWT token.
 * Contiene las credenciales de Wispro necesarias para autenticación
 * y, opcionalmente, información de usuario interno de Mecatronics.
 */
export interface JwtPayload {
  /**
   * Subject - Identificador del usuario (email o id interno)
   */
  sub: string;

  /**
   * Email del usuario (interno o de Wispro, dependiendo del contexto)
   */
  email?: string;

  /**
   * Nombre del usuario (solo para tokens internos)
   */
  name?: string;

  /**
   * Tipo de token (por ejemplo: 'internal' para login de Mecatronics)
   */
  type?: string;

  /**
   * Token CSRF de Wispro (opcional para tokens internos sin Wispro vinculado)
   */
  csrfToken?: string;

  /**
   * Cookie de sesión de Wispro (opcional para tokens internos sin Wispro vinculado)
   */
  sessionCookie?: string;

  /**
   * Información opcional de Wispro cuando el token es interno.
   * Si existe y tiene csrfToken + sessionCookie, se puede usar
   * para autenticar contra la API de Wispro.
   */
  wispro?: {
    linked: boolean;
    email?: string;
    csrfToken?: string;
    sessionCookie?: string;
    loginSuccess?: boolean;
  };

  /**
   * Información opcional de Wispro Mobile cuando el token es móvil.
   * Si existe y tiene token, se puede usar para autenticar contra la API móvil de Wispro.
   */
  wisproMobile?: {
    token?: string;
    user?: {
      name?: string;
      email?: string;
      roles?: string[];
      phone?: string;
      phone_mobile?: string;
    };
    isp?: {
      name?: string;
      language?: string;
      time_zone?: string;
    };
    loginSuccess?: boolean;
  };

  /**
   * Timestamp de cuando se emitió el token
   */
  iat?: number;

  /**
   * Timestamp de expiración del token
   */
  exp?: number;
}

