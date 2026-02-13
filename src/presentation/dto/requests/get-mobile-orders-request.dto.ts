/**
 * Get Mobile Orders Request DTO
 * 
 * DTO que define los query parameters para el endpoint de órdenes móviles.
 */
export class GetMobileOrdersRequestDto {
  /**
   * Número de resultados por página
   * @default 1000
   * @example 1000
   */
  per_page?: number;

  /**
   * Número de página
   * @default 1
   * @example 1
   */
  page?: number;

  /**
   * Filtrar órdenes con start_at mayor o igual a esta fecha
   * Formato: YYYY-MM-DD
   * @example "2026-02-12"
   */
  start_at_gteq?: string;

  /**
   * Filtrar órdenes con end_at menor o igual a esta fecha
   * Formato: YYYY-MM-DD
   * @example "2026-02-13"
   */
  end_at_lteq?: string;
}

