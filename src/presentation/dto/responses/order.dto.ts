/**
 * Order DTO
 * 
 * DTO que define la estructura de una orden, manteniendo la estructura anidada de Wispro.
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
   * Estado de la orden (pending, in_progress, completed, to_reschedule, closed, etc.)
   */
  state: string;

  /**
   * Resultado de la orden (success, failure, not_set)
   */
  result: string;

  /**
   * Descripción de la orden
   */
  description: string;

  /**
   * Fecha de creación de la orden
   */
  created_at: string;

  /**
   * Fecha/hora de inicio programada de la orden
   */
  start_at: string | null;

  /**
   * Fecha/hora de fin programada de la orden
   */
  end_at: string | null;

  /**
   * Fecha/hora de finalización de la orden
   */
  finalized_at: string | null;

  /**
   * Fecha/hora de programación de la orden
   */
  programated_at: string | null;

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
   * Punto GPS con la dirección completa (estructura de Wispro)
   */
  gps_point: {
    full_address: string;
  } | null;

  /**
   * Ticket asociado (estructura de Wispro)
   */
  ticket: {
    assigned_at: string | null;
    state: string | null;
    finalized_at: string | null;
  } | null;

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

