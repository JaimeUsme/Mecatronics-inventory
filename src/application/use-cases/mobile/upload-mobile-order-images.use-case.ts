/**
 * Upload Mobile Order Images Use Case
 * 
 * Caso de uso que sube imágenes a una orden desde la API móvil de Wispro.
 * Utiliza el cliente HTTP móvil de Wispro para hacer la petición autenticada con multipart/form-data.
 */
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WisproMobileApiClientService } from '@infrastructure/external/wispro/wispro-mobile-api-client.service';
import { JwtPayload } from '@infrastructure/auth/jwt';

@Injectable()
export class UploadMobileOrderImagesUseCase {
  private readonly logger = new Logger(UploadMobileOrderImagesUseCase.name);

  constructor(
    private readonly wisproMobileApiClient: WisproMobileApiClientService,
  ) {}

  /**
   * Ejecuta el caso de uso para subir imágenes a una orden móvil
   * Las credenciales se obtienen del JWT token
   * @param orderId - ID de la orden
   * @param file - Archivo a subir (Express.Multer.File)
   * @param jwtPayload - Payload del JWT token con el token de Wispro mobile
   * @returns Array de imágenes desde la API móvil de Wispro (sin transformar)
   */
  async execute(
    orderId: string,
    file: Express.Multer.File,
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
      `Subiendo imagen a la orden móvil ${orderId} para usuario: ${jwtPayload.sub}`,
    );
    this.logger.debug(`File received: ${JSON.stringify({
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      size: file.size,
      buffer_length: file.buffer?.length,
      has_buffer: !!file.buffer,
    })}`);

    // Llamar a la API móvil de Wispro
    const response = await this.wisproMobileApiClient.uploadOrderImages(
      authToken,
      orderId,
      file,
    );

    this.logger.log(
      `Imagen subida exitosamente para la orden móvil ${orderId}`,
    );

    // Devolver la respuesta exactamente como viene de Wispro
    // La respuesta es un array de imágenes
    return response;
  }
}

