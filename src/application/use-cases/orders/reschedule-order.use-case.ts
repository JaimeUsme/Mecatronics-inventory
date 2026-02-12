/**
 * Reschedule Order Use Case
 * 
 * Caso de uso que reprograma una orden en la API de Wispro.
 * Cambia el estado de la orden a "to_reschedule" y agrega un feedback.
 */
import { Injectable, Logger } from '@nestjs/common';
import { WisproApiClientService } from '@infrastructure/external';
import { JwtPayload } from '@infrastructure/auth/jwt';

/**
 * Interfaz para la respuesta de cambio de estado de Wispro
 */
type WisproChangeStateApiResponse = {
  id: string;
  state: string;
  [key: string]: any;
};

@Injectable()
export class RescheduleOrderUseCase {
  private readonly logger = new Logger(RescheduleOrderUseCase.name);

  // Valores quemados según lo especificado
  private readonly FEEDBACK_KIND_ID = '5b26ea6a-fd5c-4fdc-954d-4739df010463';
  private readonly STATE = 'to_reschedule';
  private readonly LOCALE = 'es';

  constructor(private readonly wisproApiClient: WisproApiClientService) {}

  /**
   * Ejecuta el caso de uso para reprogramar una orden
   * Las credenciales se obtienen del JWT token
   * @param orderId - ID de la orden
   * @param feedbackBody - Contenido del feedback que explica por qué se reprograma
   * @param jwtPayload - Payload del JWT token con las credenciales de Wispro
   * @returns Respuesta de la API de Wispro
   */
  async execute(
    orderId: string,
    feedbackBody: string,
    jwtPayload: JwtPayload,
  ): Promise<WisproChangeStateApiResponse> {
    this.logger.log(
      `Reprogramando orden ${orderId} para usuario: ${jwtPayload.sub}`,
    );

    const changeStateUrl = `/order/orders/${orderId}/change_state`;

    // Preparar el body según lo que espera Wispro
    const requestBody = {
      order: {
        state: this.STATE,
        feedbacks_attributes: [
          {
            index: 0,
            feedback_kind_id: this.FEEDBACK_KIND_ID,
            body: feedbackBody,
          },
        ],
      },
      locale: this.LOCALE,
    };

    this.logger.debug(
      `Enviando petición de cambio de estado a: ${changeStateUrl}`,
    );
    this.logger.debug(`Body completo: ${JSON.stringify(requestBody, null, 2)}`);
    this.logger.debug(`CSRF Token: ${jwtPayload.csrfToken?.substring(0, 20)}...`);
    this.logger.debug(`Session Cookie length: ${jwtPayload.sessionCookie?.length || 0}`);

    // Realizar petición autenticada a la API de Wispro
    // Usar PUT (no POST) y JSON según lo que espera Wispro
    const apiResponse: WisproChangeStateApiResponse =
      await this.wisproApiClient.put<WisproChangeStateApiResponse>(
        changeStateUrl,
        requestBody,
        {
          csrfToken: jwtPayload.csrfToken,
          sessionCookie: jwtPayload.sessionCookie,
          customReferer: 'https://cloud.wispro.co/order/orders?locale=es',
        },
      );

    this.logger.log(
      `Orden ${orderId} reprogramada exitosamente. Nuevo estado: ${apiResponse.state}`,
    );

    return apiResponse;
  }
}

