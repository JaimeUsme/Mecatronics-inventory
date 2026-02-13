/**
 * Delete Mobile Order Image Use Case
 * 
 * Caso de uso que elimina una imagen de una orden desde la API móvil de Wispro.
 * Utiliza el cliente HTTP móvil de Wispro para hacer la petición autenticada.
 */
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WisproMobileApiClientService } from '@infrastructure/external/wispro/wispro-mobile-api-client.service';
import { JwtPayload } from '@infrastructure/auth/jwt';

@Injectable()
export class DeleteMobileOrderImageUseCase {
  private readonly logger = new Logger(DeleteMobileOrderImageUseCase.name);

  constructor(
    private readonly wisproMobileApiClient: WisproMobileApiClientService,
  ) {}

  /**
   * Ejecuta el caso de uso para eliminar una imagen de una orden móvil
   * Las credenciales se obtienen del JWT token
   * @param orderId - ID de la orden
   * @param imageId - ID de la imagen a eliminar
   * @param jwtPayload - Payload del JWT token con el token de Wispro mobile
   * @returns Respuesta de la API móvil de Wispro (generalmente vacía o mínima)
   */
  async execute(
    orderId: string,
    imageId: string,
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
      `Eliminando imagen ${imageId} de la orden móvil ${orderId} para usuario: ${jwtPayload.sub}`,
    );

    // Llamar a la API móvil de Wispro
    const response = await this.wisproMobileApiClient.deleteOrderImage(
      authToken,
      orderId,
      imageId,
    );

    this.logger.log(
      `Imagen ${imageId} eliminada exitosamente de la orden móvil ${orderId}`,
    );

    // Devolver la respuesta exactamente como viene de Wispro
    // La respuesta generalmente es vacía o mínima
    return response;
  }
}

