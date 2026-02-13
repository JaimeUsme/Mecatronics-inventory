/**
 * Get Order Feedbacks Use Case
 * 
 * Caso de uso que obtiene los feedbacks de una orden desde la API de Wispro.
 * Utiliza el cliente HTTP de Wispro para hacer la petición autenticada.
 */
import { Injectable, Logger } from '@nestjs/common';
import { WisproApiClientService } from '@infrastructure/external';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { OrderFeedbackDto, GetOrderFeedbacksResponseDto } from '@presentation/dto';

/**
 * Interfaz para la respuesta cruda de la API de Wispro
 * Wispro devuelve un array de feedbacks
 */
type WisproOrderFeedbacksApiResponse = Array<{
  id: string;
  order_id?: string;
  feedback_type?: string;
  comment?: string;
  body?: string;
  feedback_kind_id?: string;
  rating?: number;
  created_at: string;
  updated_at?: string;
  user?: {
    id: string;
    name: string;
    email?: string;
  };
  [key: string]: any;
}>;

@Injectable()
export class GetOrderFeedbacksUseCase {
  private readonly logger = new Logger(GetOrderFeedbacksUseCase.name);

  constructor(private readonly wisproApiClient: WisproApiClientService) {}

  /**
   * Constante para el ID del tipo de feedback de materiales
   */
  private readonly MATERIAL_FEEDBACK_KIND_ID = 'bd40d1ad-5b89-42a4-a70f-2ec8b2392e16';

  /**
   * Determina si un feedback es de tipo material
   * @param feedback - Feedback a evaluar
   * @returns true si es un feedback de material
   */
  private isMaterialFeedback(feedback: OrderFeedbackDto): boolean {
    // Verificar si el feedback_kind_id coincide
    if (feedback.feedback_kind_id !== this.MATERIAL_FEEDBACK_KIND_ID) {
      return false;
    }

    // Intentar parsear el body como JSON
    try {
      const body = feedback.body || feedback.comment || '';
      if (!body) {
        return false;
      }

      const parsed = JSON.parse(body);
      // Verificar si contiene materials (array) o materialUsage
      return (
        Array.isArray(parsed.materials) || parsed.materialUsage !== undefined
      );
    } catch {
      // Si no se puede parsear, no es un feedback de material
      return false;
    }
  }

  /**
   * Ejecuta el caso de uso para obtener los feedbacks de una orden
   * Las credenciales se obtienen del JWT token
   * Excluye los feedbacks de materiales (solo devuelve feedbacks normales/comentarios)
   * @param orderId - ID de la orden
   * @param jwtPayload - Payload del JWT token con las credenciales de Wispro
   * @returns Array de feedbacks normales (sin materiales)
   */
  async execute(
    orderId: string,
    jwtPayload: JwtPayload,
  ): Promise<OrderFeedbackDto[]> {
    this.logger.log(
      `Obteniendo feedbacks de la orden ${orderId} para usuario: ${jwtPayload.sub}`,
    );

    const feedbacksUrl = `/order/orders/${orderId}/feedbacks`;

    // Realizar petición autenticada a la API de Wispro
    const apiResponse: WisproOrderFeedbacksApiResponse =
      await this.wisproApiClient.get<WisproOrderFeedbacksApiResponse>(
        feedbacksUrl,
        {
          csrfToken: jwtPayload.csrfToken,
          sessionCookie: jwtPayload.sessionCookie,
          customReferer: 'https://cloud.wispro.co/order/orders?locale=es',
        },
      );

    // Mapear respuesta de la API a nuestro DTO
    const allFeedbacks: OrderFeedbackDto[] = (Array.isArray(apiResponse) ? apiResponse : []).map(
      (feedback) => ({
        id: feedback.id || '',
        order_id: feedback.order_id || orderId,
        feedback_type: feedback.feedback_type,
        comment: feedback.comment,
        rating: feedback.rating,
        created_at: feedback.created_at || '',
        updated_at: feedback.updated_at,
        user: feedback.user,
        body: feedback.body || feedback.comment, // Asegurar que body esté presente
        feedback_kind_id: feedback.feedback_kind_id, // Incluir feedback_kind_id
        ...feedback, // Incluir cualquier campo adicional
      }),
    );

    // Filtrar solo feedbacks normales (excluir materiales)
    const feedbacks = allFeedbacks.filter((f) => !this.isMaterialFeedback(f));

    this.logger.log(
      `Feedbacks obtenidos exitosamente: ${feedbacks.length} feedbacks normales (${allFeedbacks.length - feedbacks.length} materiales excluidos) para la orden ${orderId}`,
    );

    // Devolver solo feedbacks normales (sin materiales)
    return feedbacks;
  }
}

