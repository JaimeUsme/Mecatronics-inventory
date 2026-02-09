/**
 * Upload Order Image Use Case
 * 
 * Caso de uso que sube una imagen a una orden en la API de Wispro.
 * Utiliza el cliente HTTP de Wispro para hacer la petición autenticada con multipart/form-data.
 */
import { Injectable, Logger } from '@nestjs/common';
import { WisproApiClientService } from '@infrastructure/external';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { OrderImageDto } from '@presentation/dto';

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

  constructor(private readonly wisproApiClient: WisproApiClientService) {}

  /**
   * Ejecuta el caso de uso para subir una imagen a una orden
   * Las credenciales se obtienen del JWT token
   * @param orderId - ID de la orden
   * @param file - Archivo a subir (Express.Multer.File)
   * @param jwtPayload - Payload del JWT token con las credenciales de Wispro
   * @returns Array de imágenes de la orden (incluyendo la nueva)
   */
  async execute(
    orderId: string,
    file: Express.Multer.File,
    jwtPayload: JwtPayload,
  ): Promise<OrderImageDto[]> {
    this.logger.log(
      `Subiendo imagen a la orden ${orderId} para usuario: ${jwtPayload.sub}`,
    );

    const imagesUrl = `/order/orders/${orderId}/images`;

    // Realizar petición autenticada a la API de Wispro con multipart/form-data
    const apiResponse: WisproOrderImagesApiResponse =
      await this.wisproApiClient.postMultipart<WisproOrderImagesApiResponse>(
        imagesUrl,
        file,
        {
          csrfToken: jwtPayload.csrfToken,
          sessionCookie: jwtPayload.sessionCookie,
          customReferer: 'https://cloud.wispro.co/order/orders?locale=es',
        },
      );

    // Mapear respuesta de la API a nuestro DTO
    const images: OrderImageDto[] = (Array.isArray(apiResponse) ? apiResponse : []).map(
      (image) => ({
        id: image.id || '',
        created_at: image.created_at || '',
        filename: image.filename || '',
        original: image.original || '',
        thumb: image.thumb || '',
        mini: image.mini || '',
      }),
    );

    this.logger.log(
      `Imagen subida exitosamente. Total de imágenes para la orden ${orderId}: ${images.length}`,
    );

    return images;
  }
}

