/**
 * Get Orders Request DTO
 * 
 * DTO que define los query parameters para el endpoint de órdenes.
 */
export class GetOrdersRequestDto {
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
   * Filtrar órdenes en progreso
   * @default false
   * @example true
   */
  in_progress?: boolean;

  /**
   * Filtrar órdenes programadas
   * @default false
   * @example true
   */
  scheduled?: boolean;

  /**
   * Filtrar órdenes completadas y exitosas
   * Cuando es true, aplica los filtros q[completed]=true&q[success]=true
   * @default false
   * @example true
   */
  completed?: boolean;

  /**
   * Filtrar órdenes por ID de empleado específico
   * @example "11b17a34-cd35-4c3c-9396-648d57408ab7"
   */
  employee_id?: string;
}

