/**
 * Upload Order Image Use Case
 *
 * Caso de uso que sube una imagen a una orden en la API de Wispro.
 * Utiliza el cliente HTTP de Wispro para hacer la petición autenticada con multipart/form-data.
 */
import { Injectable, Logger } from '@nestjs/common';
import { WisproApiWrapperService } from '@infrastructure/external';
import { TokenRefreshContextService } from '@application/services/token-refresh-context.service';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { GetOrderImagesResponseDto } from '@presentation/dto';
import { GetOrderImagesUseCase } from './get-order-images.use-case';

/**
 * Interfaz para la respuesta cruda de la API de Wispro
 * Wispro devuelve un array de imágenes (incluyendo la nueva)
 */
type WisproOrderImagesApiResponse = Array<{
  id: string;
  created_at: string;
  filename: string;
  original: string;
  thumb: string;
  mini: string;
}>;

@Injectable()
export class UploadOrderImageUseCase {
  private readonly logger = new Logger(UploadOrderImageUseCase.name);

  constructor(
    private readonly wisproApiClient: WisproApiWrapperService,
    private readonly tokenRefreshContext: TokenRefreshContextService,
    private readonly getOrderImagesUseCase: GetOrderImagesUseCase,
  ) {}

  /**
   * Ejecuta el caso de uso para subir una imagen a una orden
   * Las credenciales se obtienen del JWT token
   * Después de subir la imagen, obtiene la lista completa de imágenes separadas
   * @param orderId - ID de la orden
   * @param file - Archivo a subir (Express.Multer.File)
   * @param jwtPayload - Payload del JWT token con las credenciales de Wispro
   * @returns Objeto con imágenes normales y firma separadas (incluyendo la nueva)
   */
  async execute(
    orderId: string,
    file: Express.Multer.File,
    jwtPayload: JwtPayload,
  ): Promise<GetOrderImagesResponseDto> {
    this.logger.log(
      `Subiendo imagen a la orden ${orderId} para usuario: ${jwtPayload.sub}`,
    );

    const imagesUrl = `/order/orders/${orderId}/images`;

    // Realizar petición autenticada a la API de Wispro con multipart/form-data
    const wrappedResponse = await this.wisproApiClient.postMultipart<WisproOrderImagesApiResponse>(
      imagesUrl,
      file,
      {
        csrfToken: jwtPayload.csrfToken,
        sessionCookie: jwtPayload.sessionCookie,
        customReferer: 'https://cloud.wispro.co/order/orders?locale=es',
        userId: jwtPayload.sub,
      },
    );

    if (wrappedResponse.newJwt) {
      this.tokenRefreshContext.setNewJwt(wrappedResponse.newJwt);
    }

    this.logger.log(
      `Imagen subida exitosamente para la orden ${orderId}`,
    );

    // Después de subir la imagen, obtener la lista completa de imágenes separadas
    const allImages = await this.getOrderImagesUseCase.execute(
      orderId,
      jwtPayload,
    );

    this.logger.log(
      `Lista de imágenes obtenida: ${allImages.images.length} imágenes normales, ${allImages.sign ? '1' : '0'} firma(s) para la orden ${orderId}`,
    );

    return allImages;
  }
}

