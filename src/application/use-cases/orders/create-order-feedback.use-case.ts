/**
 * Create Order Feedback Use Case
 * 
 * Caso de uso que crea un feedback en una orden en la API de Wispro.
 * Utiliza el cliente HTTP de Wispro para hacer la petición autenticada.
 */
import { Injectable, Logger } from '@nestjs/common';
import { WisproApiClientService } from '@infrastructure/external';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { CreateOrderFeedbackRequestDto, GetOrderFeedbacksResponseDto } from '@presentation/dto';
import { GetOrderFeedbacksUseCase } from './get-order-feedbacks.use-case';

/**
 * Interfaz para la respuesta cruda de la API de Wispro
 * Wispro devuelve el feedback creado
 */
type WisproCreateFeedbackApiResponse = {
  id: string;
  order_id?: string;
  feedback_type?: string;
  comment?: string;
  body?: string;
  rating?: number;
  created_at: string;
  updated_at?: string;
  user?: {
    id: string;
    name: string;
    email?: string;
  };
  [key: string]: any;
};

@Injectable()
export class CreateOrderFeedbackUseCase {
  private readonly logger = new Logger(CreateOrderFeedbackUseCase.name);

  constructor(
    private readonly wisproApiClient: WisproApiClientService,
    private readonly getOrderFeedbacksUseCase: GetOrderFeedbacksUseCase,
  ) {}

  /**
   * Ejecuta el caso de uso para crear un feedback en una orden
   * Las credenciales se obtienen del JWT token
   * Después de crear el feedback, obtiene la lista completa de feedbacks separados
   * @param orderId - ID de la orden
   * @param requestDto - Datos del feedback a crear
   * @param jwtPayload - Payload del JWT token con las credenciales de Wispro
   * @returns Objeto con feedbacks normales y materiales separados (incluyendo el nuevo)
   */
  async execute(
    orderId: string,
    requestDto: CreateOrderFeedbackRequestDto,
    jwtPayload: JwtPayload,
  ): Promise<GetOrderFeedbacksResponseDto> {
    this.logger.log(
      `Creando feedback en la orden ${orderId} para usuario: ${jwtPayload.sub}`,
    );

    const feedbacksUrl = `/order/orders/${orderId}/feedbacks`;

    // Preparar el body según lo que espera Wispro
    const requestBody = {
      feedback: {
        body: requestDto.feedback.body,
        feedback_kind_id: requestDto.feedback.feedback_kind_id,
      },
      locale: requestDto.locale || 'es',
    };

    // Realizar petición autenticada a la API de Wispro
    const apiResponse: WisproCreateFeedbackApiResponse =
      await this.wisproApiClient.post<WisproCreateFeedbackApiResponse>(
        feedbacksUrl,
        requestBody,
        {
          csrfToken: jwtPayload.csrfToken,
          sessionCookie: jwtPayload.sessionCookie,
          customReferer: 'https://cloud.wispro.co/order/orders?locale=es',
        },
      );

    this.logger.log(
      `Feedback creado exitosamente: ${apiResponse.id} para la orden ${orderId}`,
    );

    // Después de crear el feedback, obtener la lista completa de feedbacks
    const allFeedbacks = await this.getOrderFeedbacksUseCase.execute(
      orderId,
      jwtPayload,
    );

    this.logger.log(
      `Lista de feedbacks obtenida: ${allFeedbacks.feedbacks.length} feedbacks normales, ${allFeedbacks.materials.length} materiales para la orden ${orderId}`,
    );

    return allFeedbacks;
  }
}

