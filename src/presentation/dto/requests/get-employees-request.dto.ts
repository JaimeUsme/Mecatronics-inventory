/**
 * Get Employees Request DTO
 * 
 * DTO que define los query parameters para el endpoint de empleados.
 */
export class GetEmployeesRequestDto {
  /**
   * Número de resultados por página
   * @default 20
   * @example 20
   */
  per_page?: number;

  /**
   * Número de página
   * @default 1
   * @example 1
   */
  page?: number;

  /**
   * Indica que la respuesta viene optimizada para React
   * @default true
   * @example true
   */
  react?: boolean;

  /**
   * Término de búsqueda para filtrar empleados por nombre, email o teléfono
   * @example "RUBY"
   */
  search?: string;

  /**
   * Nombre de rol para filtrar empleados (por ejemplo: "owner", "technician").
   * Si se envía, solo se devolverán empleados que tengan al menos un rol
   * con ese name.
   * @example "technician"
   */
  role_name?: string;
}

