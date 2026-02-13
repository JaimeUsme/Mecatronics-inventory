/**
 * Get Order Counts Request DTO
 * 
 * DTO que define los query parameters para el endpoint de conteos de órdenes.
 */
export class GetOrderCountsRequestDto {
  /**
   * Buscar por nombre o cédula del cliente
   * Usa el parámetro q[orderable_name_unaccent_cont] de Wispro
   * @example "JUAN CARLOS"
   */
  search?: string;
}


