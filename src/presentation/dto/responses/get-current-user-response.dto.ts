/**
 * Get Current User Response DTO
 * 
 * DTO que define la estructura de la respuesta del endpoint de usuario actual.
 * Contiene los campos: id, name, email, phone_mobile, userable_id.
 */
export class GetCurrentUserResponseDto {
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
   * Teléfono móvil del usuario
   */
  phone_mobile: string;

  /**
   * ID del userable (Employee, etc.)
   */
  userable_id: string;
}

