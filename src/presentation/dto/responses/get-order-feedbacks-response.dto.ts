/**
 * Get Order Feedbacks Response DTO
 * 
 * DTO que define la estructura de la respuesta del endpoint de feedbacks de una orden.
 * Separa los feedbacks normales de los que contienen información de materiales.
 */
import { OrderFeedbackDto } from './order-feedback.dto';

export class GetOrderFeedbacksResponseDto {
  /**
   * Feedbacks normales (comentarios)
   */
  feedbacks: OrderFeedbackDto[];

  /**
   * Feedbacks que contienen información de materiales
   * (feedback_kind_id === 'bd40d1ad-5b89-42a4-a70f-2ec8b2392e16' y body parseable con materials o materialUsage)
   */
  materials: OrderFeedbackDto[];
}


