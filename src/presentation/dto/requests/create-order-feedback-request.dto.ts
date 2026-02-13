/**
 * Create Order Feedback Request DTO
 * 
 * DTO para crear un feedback en una orden.
 */
export class CreateOrderFeedbackRequestDto {
  /**
   * Información del feedback
   */
  feedback: {
    /**
     * Cuerpo/comentario del feedback
     */
    body: string;

    /**
     * ID del tipo de feedback
     */
    feedback_kind_id: string;
  };

  /**
   * Locale (idioma)
   */
  locale?: string;
}


