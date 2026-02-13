/**
 * Reschedule Order Request DTO
 * 
 * DTO que define los datos necesarios para reprogramar una orden.
 */
export class RescheduleOrderRequestDto {
  /**
   * Contenido del feedback que explica por qué se reprograma la orden
   * @example "usuario no esta en la casa"
   */
  feedback_body: string;
}


