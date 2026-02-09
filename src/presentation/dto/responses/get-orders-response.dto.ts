/**
 * Get Orders Response DTO
 * 
 * DTO que define la estructura de la respuesta del endpoint de órdenes.
 */
import { OrderDto } from './order.dto';
import { PaginationDto } from './get-employees-response.dto';

export class GetOrdersResponseDto {
  /**
   * Lista de órdenes con los campos: id, sequential_id, state, employee_name, orderable_name, full_address, created_at, assigned_at, description
   */
  orders: OrderDto[];

  /**
   * Información de paginación
   */
  pagination: PaginationDto;
}

