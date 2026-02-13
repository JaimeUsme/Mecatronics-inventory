/**
 * Mobile Login Response DTO
 * 
 * DTO que define la estructura de la respuesta del login móvil.
 * Incluye el JWT token con información combinada de internal_user y Wispro mobile.
 */
export class MobileLoginResponseDto {
  /**
   * JWT token con información combinada de internal_user y Wispro mobile
   */
  accessToken: string;

  /**
   * Información del usuario interno
   */
  user: {
    id: string;
    name: string;
    email: string;
  };

  /**
   * Información de Wispro mobile (si el login fue exitoso)
   */
  wispro?: {
    token: string;
    user: {
      name: string;
      email: string;
      roles: string[];
      phone: string;
      phone_mobile: string;
    };
    isp: {
      name: string;
      language: string;
      time_zone: string;
    };
  };
}


