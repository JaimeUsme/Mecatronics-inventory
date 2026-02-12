/**
 * Profile Response DTO
 * 
 * DTO que define la estructura de la respuesta del endpoint de perfil.
 * Incluye información del usuario y estado de conexión con Wispro.
 */
export class WisproConnectionStatusDto {
  /**
   * Indica si hay una conexión activa con Wispro
   */
  isConnected: boolean;

  /**
   * Indica si hay una cuenta de Wispro vinculada (puede estar vinculada pero no conectada)
   */
  isLinked: boolean;

  /**
   * Indica si el último intento de login a Wispro fue exitoso
   */
  loginSuccess?: boolean;

  /**
   * Email de la cuenta de Wispro vinculada
   */
  wisproEmail?: string;
}

export class ProfileResponseDto {
  /**
   * ID del usuario
   */
  id: string;

  /**
   * Nombre del usuario
   */
  name: string;

  /**
   * Email del usuario
   */
  email: string;

  /**
   * Tipo de usuario: 'internal' para usuarios de Mecatronics, 'wispro' para usuarios directos de Wispro
   */
  userType: 'internal' | 'wispro';

  /**
   * Teléfono móvil (solo disponible para usuarios de Wispro)
   */
  phone_mobile?: string;

  /**
   * ID del userable (Employee, etc.) - solo disponible para usuarios de Wispro
   */
  userable_id?: string;

  /**
   * Estado de conexión con Wispro
   */
  wispro: WisproConnectionStatusDto;
}

