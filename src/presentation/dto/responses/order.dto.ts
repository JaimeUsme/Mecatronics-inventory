/**
 * Order DTO
 * 
 * DTO que define la estructura de una orden simplificada.
 */
export class OrderDto {
  /**
   * ID único de la orden
   */
  id: string;

  /**
   * ID secuencial de la orden
   */
  sequential_id: number;

  /**
   * Estado de la orden (pending, in_progress, completed, etc.)
   */
  state: string;

  /**
   * ID del empleado asignado
   */
  employee_id: string;

  /**
   * Nombre del empleado asignado
   */
  employee_name: string;

  /**
   * Nombre del contrato/cliente (orderable name)
   */
  orderable_name: string;

  /**
   * Dirección completa (full_address del gps_point)
   */
  full_address: string;

  /**
   * Fecha de creación de la orden
   */
  created_at: string;

  /**
   * Fecha de asignación (assigned_at del ticket)
   */
  assigned_at: string | null;

  /**
   * Descripción de la orden
   */
  description: string;

  /**
   * Información de la cuadrilla al momento de la orden (snapshot histórico)
   */
  crew_snapshot?: {
    crew_id: string | null;
    crew_name: string | null;
    member_ids: string[];
    members: Array<{
      technician_id: string;
      role: string | null;
    }>;
  } | null;
}

