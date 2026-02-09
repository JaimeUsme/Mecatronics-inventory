/**
 * Role DTO
 * 
 * DTO que define la estructura de un rol de Wispro.
 */
export class RoleDto {
  /**
   * ID del rol
   */
  id: string;

  /**
   * Nombre del rol (owner, administrative, technician, helpdesk_supervisor, etc.)
   */
  name: string;

  /**
   * ID del recurso asociado (puede ser null)
   */
  resource_id: string | null;

  /**
   * Tipo de recurso asociado (puede ser null)
   */
  resource_type: string | null;
}

/**
 * Employee DTO
 * 
 * DTO que define la estructura de un empleado con los campos solicitados.
 */
export class EmployeeDto {
  /**
   * ID público del empleado
   */
  public_id: string;

  /**
   * Nombre del empleado
   */
  name: string;

  /**
   * Email del empleado
   */
  email: string;

  /**
   * ID del empleado
   */
  id: string;

  /**
   * Teléfono móvil del empleado
   */
  phone_mobile: string;

  /**
   * Indica si el usuario/empleado está activo en Wispro
   */
  active: boolean;

  /**
   * Roles del empleado
   */
  roles: RoleDto[];
}

