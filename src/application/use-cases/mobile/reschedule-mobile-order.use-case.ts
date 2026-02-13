/**
 * Reschedule Mobile Order Use Case
 * 
 * Caso de uso que reagenda una orden desde la API móvil de Wispro.
 * Utiliza el cliente HTTP móvil de Wispro para hacer la petición autenticada.
 */
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WisproMobileApiClientService } from '@infrastructure/external/wispro/wispro-mobile-api-client.service';
import { JwtPayload } from '@infrastructure/auth/jwt';

@Injectable()
export class RescheduleMobileOrderUseCase {
  private readonly logger = new Logger(RescheduleMobileOrderUseCase.name);

  constructor(
    private readonly wisproMobileApiClient: WisproMobileApiClientService,
  ) {}

  /**
   * Ejecuta el caso de uso para reagendar una orden móvil
   * Las credenciales se obtienen del JWT token
   * @param orderId - ID de la orden
   * @param feedbackBody - Cuerpo del feedback explicando por qué se reagenda
   * @param jwtPayload - Payload del JWT token con el token de Wispro mobile
   * @returns Objeto con la orden reagendada desde la API móvil de Wispro (sin transformar)
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
      `Reagendando orden móvil ${orderId} para usuario: ${jwtPayload.sub}`,
    );
    this.logger.debug(`Feedback body: ${feedbackBody}`);

    // Llamar a la API móvil de Wispro
    const response = await this.wisproMobileApiClient.rescheduleOrder(
      authToken,
      orderId,
      feedbackBody,
    );

    this.logger.log(
      `Orden móvil ${orderId} reagendada exitosamente`,
    );

    // Devolver la respuesta exactamente como viene de Wispro
    return response;
  }
}

