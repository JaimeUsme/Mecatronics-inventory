/**
 * Create Mobile Order Feedback Use Case
 * 
 * Caso de uso que crea un feedback en una orden desde la API móvil de Wispro.
 * Utiliza el cliente HTTP móvil de Wispro para hacer la petición autenticada.
 */
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WisproMobileApiClientService } from '@infrastructure/external/wispro/wispro-mobile-api-client.service';
import { JwtPayload } from '@infrastructure/auth/jwt';

@Injectable()
export class CreateMobileOrderFeedbackUseCase {
  private readonly logger = new Logger(CreateMobileOrderFeedbackUseCase.name);

  constructor(
    private readonly wisproMobileApiClient: WisproMobileApiClientService,
  ) {}

  /**
   * Ejecuta el caso de uso para crear un feedback en una orden móvil
   * Las credenciales se obtienen del JWT token
   * @param orderId - ID de la orden
   * @param feedbackBody - Cuerpo del feedback
   * @param jwtPayload - Payload del JWT token con el token de Wispro mobile
   * @returns Objeto con el feedback creado desde la API móvil de Wispro (sin transformar)
   */
  async execute(
    orderId: string,
    feedbackBody: string,
    jwtPayload: JwtPayload,
  ): Promise<any> {
    // Validar que el token tenga credenciales de Wispro mobile
    if (
      !jwtPayload.wisproMobile ||
      !jwtPayload.wisproMobile.token ||
      jwtPayload.wisproMobile.loginSuccess !== true
    ) {
      this.logger.warn(
        `Token móvil sin credenciales válidas de Wispro mobile para usuario: ${jwtPayload.sub}`,
      );
      throw new UnauthorizedException(
        'Token inválido: faltan credenciales de Wispro mobile. Usa /mobile/v1/login para autenticarte.',
      );
    }

    const authToken = jwtPayload.wisproMobile.token;

    this.logger.log(
      `Creando feedback en la orden móvil ${orderId} para usuario: ${jwtPayload.sub}`,
    );
    this.logger.debug(`Feedback body: ${feedbackBody}`);

    // Llamar a la API móvil de Wispro
    const response = await this.wisproMobileApiClient.createOrderFeedback(
      authToken,
      orderId,
      feedbackBody,
    );

    this.logger.log(
      `Feedback creado exitosamente para la orden móvil ${orderId}`,
    );

    // Devolver la respuesta exactamente como viene de Wispro
    return response;
  }
}

