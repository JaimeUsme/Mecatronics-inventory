/**
 * Finalize Mobile Order Request DTO
 * 
 * DTO que define el body para finalizar una orden móvil.
 */
export class FinalizeMobileOrderRequestDto {
  /**
   * Feedback opcional al finalizar la orden
   */
  feedback?: {
    /**
     * Cuerpo del feedback
     * @example "Todo correcto"
     */
    body: string;
  };

  /**
   * Datos de la orden para finalizar
   */
  order: {
    /**
     * Fecha y hora de inicio (ISO 8601)
     * @example "2026-02-12T18:41:14.695Z"
     */
    initialized_at: string;

    /**
     * Fecha y hora de finalización (ISO 8601)
     * @example "2026-02-12T20:23:50.385Z"
     */
    finalized_at: string;

    /**
     * Resultado de la orden
     * @example "success"
     */
    result: string;
  };
}

