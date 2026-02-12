/**
 * Get Orders Response DTO
 * 
 * DTO que define la estructura de la respuesta del endpoint de órdenes.
 */
import { OrderDto } from './order.dto';
import { PaginationDto } from './get-employees-response.dto';

export class GetOrdersResponseDto {
  /**
   * Lista de órdenes con la estructura de Wispro:
   * - Campos principales: id, sequential_id, state, result, description, created_at, start_at, end_at, finalized_at
   * - employee_id, employee_name, orderable_name
   * - gps_point: { full_address }
   * - ticket: { assigned_at, state, finalized_at }
   */
  orders: OrderDto[];

  /**
   * Información de paginación
   */
  pagination: PaginationDto;
}

