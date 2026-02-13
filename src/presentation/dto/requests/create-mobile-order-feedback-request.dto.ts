/**
 * Create Mobile Order Feedback Request DTO
 * 
 * DTO que define el body para crear un feedback en una orden móvil.
 */
export class CreateMobileOrderFeedbackRequestDto {
  /**
   * Objeto feedback con el cuerpo del mensaje
   */
  feedback: {
    /**
     * Cuerpo del feedback
     * @example "Prueba app"
     */
    body: string;
  };
}

