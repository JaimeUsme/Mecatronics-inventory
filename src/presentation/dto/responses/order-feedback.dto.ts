/**
 * Order Feedback DTO
 * 
 * DTO que representa un feedback de una orden.
 */
export class OrderFeedbackDto {
  /**
   * ID del feedback
   */
  id: string;

  /**
   * ID de la orden
   */
  order_id: string;

  /**
   * Tipo de feedback
   */
  feedback_type?: string;

  /**
   * Comentario del feedback
   */
  comment?: string;

  /**
   * Cuerpo del feedback (puede contener JSON para materiales)
   */
  body?: string;

  /**
   * ID del tipo de feedback
   */
  feedback_kind_id?: string;

  /**
   * Calificación (si aplica)
   */
  rating?: number;

  /**
   * Fecha de creación
   */
  created_at: string;

  /**
   * Fecha de actualización
   */
  updated_at?: string;

  /**
   * Usuario que creó el feedback
   */
  user?: {
    id: string;
    name: string;
    email?: string;
  };

  [key: string]: any; // Para campos adicionales que puedan venir
}

