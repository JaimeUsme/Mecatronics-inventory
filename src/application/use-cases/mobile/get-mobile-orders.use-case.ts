/**
 * Get Mobile Orders Use Case
 * 
 * Caso de uso que obtiene la lista de órdenes desde la API móvil de Wispro.
 * Utiliza el cliente HTTP móvil de Wispro para hacer la petición autenticada.
 */
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WisproMobileApiClientService } from '@infrastructure/external/wispro/wispro-mobile-api-client.service';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { GetMobileOrdersRequestDto } from '@presentation/dto';

@Injectable()
export class GetMobileOrdersUseCase {
  private readonly logger = new Logger(GetMobileOrdersUseCase.name);

  constructor(
    private readonly wisproMobileApiClient: WisproMobileApiClientService,
  ) {}

  /**
   * Ejecuta el caso de uso para obtener la lista de órdenes móviles
   * Las credenciales se obtienen del JWT token
   * @param requestDto - Query parameters (per_page, page, start_at_gteq, end_at_lteq)
   * @param jwtPayload - Payload del JWT token con el token de Wispro mobile
   * @returns Respuesta de órdenes desde la API móvil de Wispro (sin transformar)
   */
  async execute(
    requestDto: GetMobileOrdersRequestDto,
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

    this.logger.debug(
      `Obteniendo órdenes móviles para usuario: ${jwtPayload.sub}`,
    );
    this.logger.debug(`Query params: ${JSON.stringify(requestDto)}`);

    // Llamar a la API móvil de Wispro
    const response = await this.wisproMobileApiClient.getOrders(authToken, {
      per_page: requestDto.per_page,
      page: requestDto.page,
      start_at_gteq: requestDto.start_at_gteq,
      end_at_lteq: requestDto.end_at_lteq,
    });

    // Devolver la respuesta exactamente como viene de Wispro
    // La respuesta es: [[órdenes], {pagination: {...}}]
    return response;
  }
}

