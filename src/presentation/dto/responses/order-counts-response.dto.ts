/**
 * Order Counts Response DTO
 * 
 * DTO que define la estructura de la respuesta del endpoint de conteos de órdenes.
 */
export class OrderCountsResponseDto {
  /**
   * Total de órdenes fallidas (q[completed]=true&q[failure]=true)
   */
  failed: number;

  /**
   * Total de órdenes exitosas (q[completed]=true&q[success]=true)
   */
  success: number;

  /**
   * Total de órdenes programadas (q[in_progress]=true&q[scheduled]=true)
   */
  scheduled: number;

  /**
   * Total de órdenes sin programar (q[in_progress]=true&q[unscheduled]=true)
   */
  unscheduled: number;
}

