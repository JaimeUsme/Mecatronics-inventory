/**
 * Order Mapper
 * 
 * Mapper que transforma la respuesta de la API de Wispro
 * a nuestro DTO de orden con solo los campos solicitados.
 */
import { OrderDto } from '@presentation/dto';

/**
 * Interfaz que representa la estructura de una orden en la respuesta de Wispro
 */
interface WisproOrder {
  id?: string;
  sequential_id?: number;
  state?: string;
  description?: string;
  created_at?: string;
  employee_id?: string;
  employee?: {
    id?: string;
    name?: string;
    [key: string]: any;
  };
  orderable?: {
    name?: string;
    [key: string]: any;
  };
  gps_point?: {
    full_address?: string;
    [key: string]: any;
  };
  ticket?: {
    assigned_at?: string | null;
    [key: string]: any;
  };
  [key: string]: any; // Para campos adicionales que puedan venir
}

/**
 * Mapea una orden de la API de Wispro a nuestro DTO
 * @param wisproOrder - Orden de la respuesta de Wispro
 * @returns Orden mapeada con solo los campos solicitados
 */
export function mapWisproOrderToDto(wisproOrder: WisproOrder): OrderDto {
  // Extraer employee_id: puede venir directamente en la orden o dentro del objeto employee
  const employeeId = wisproOrder.employee_id || wisproOrder.employee?.id || '';

  const order: OrderDto = {
    id: wisproOrder.id || '',
    sequential_id: wisproOrder.sequential_id || 0,
    state: wisproOrder.state || '',
    employee_id: employeeId,
    employee_name: wisproOrder.employee?.name || '',
    orderable_name: wisproOrder.orderable?.name || '',
    full_address: wisproOrder.gps_point?.full_address || '',
    created_at: wisproOrder.created_at || '',
    assigned_at: wisproOrder.ticket?.assigned_at || null,
    description: wisproOrder.description || '',
  };

  return order;
}

/**
 * Mapea un array de órdenes de la API de Wispro a nuestro DTO
 * @param wisproOrders - Array de órdenes de la respuesta de Wispro
 * @returns Array de órdenes mapeadas
 */
export function mapWisproOrdersToDto(wisproOrders: WisproOrder[]): OrderDto[] {
  return wisproOrders.map(mapWisproOrderToDto);
}

