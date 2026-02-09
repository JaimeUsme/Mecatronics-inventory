/**
 * Get Order Feedbacks Use Case
 * 
 * Caso de uso que obtiene los feedbacks de una orden desde la API de Wispro.
 * Utiliza el cliente HTTP de Wispro para hacer la petición autenticada.
 */
import { Injectable, Logger } from '@nestjs/common';
import { WisproApiClientService } from '@infrastructure/external';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { OrderFeedbackDto } from '@presentation/dto';

/**
 * Interfaz para la respuesta cruda de la API de Wispro
 * Wispro devuelve un array de feedbacks
 */
type WisproOrderFeedbacksApiResponse = Array<{
  id: string;
  order_id?: string;
  feedback_type?: string;
  comment?: string;
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
   * Ejecuta el caso de uso para obtener los feedbacks de una orden
   * Las credenciales se obtienen del JWT token
   * @param orderId - ID de la orden
   * @param jwtPayload - Payload del JWT token con las credenciales de Wispro
   * @returns Array de feedbacks de la orden
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
    const feedbacks: OrderFeedbackDto[] = (Array.isArray(apiResponse) ? apiResponse : []).map(
      (feedback) => ({
        id: feedback.id || '',
        order_id: feedback.order_id || orderId,
        feedback_type: feedback.feedback_type,
        comment: feedback.comment,
        rating: feedback.rating,
        created_at: feedback.created_at || '',
        updated_at: feedback.updated_at,
        user: feedback.user,
        ...feedback, // Incluir cualquier campo adicional
      }),
    );

    this.logger.log(
      `Feedbacks obtenidos exitosamente: ${feedbacks.length} feedbacks para la orden ${orderId}`,
    );

    return feedbacks;
  }
}

