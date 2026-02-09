/**
 * Get Order Images Use Case
 * 
 * Caso de uso que obtiene las imágenes de una orden desde la API de Wispro.
 * Utiliza el cliente HTTP de Wispro para hacer la petición autenticada.
 */
import { Injectable, Logger } from '@nestjs/common';
import { WisproApiClientService } from '@infrastructure/external';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { OrderImageDto } from '@presentation/dto';

/**
 * Interfaz para la respuesta cruda de la API de Wispro
 * Wispro devuelve un array de imágenes
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
export class GetOrderImagesUseCase {
  private readonly logger = new Logger(GetOrderImagesUseCase.name);

  constructor(private readonly wisproApiClient: WisproApiClientService) {}

  /**
   * Ejecuta el caso de uso para obtener las imágenes de una orden
   * Las credenciales se obtienen del JWT token
   * @param orderId - ID de la orden
   * @param jwtPayload - Payload del JWT token con las credenciales de Wispro
   * @returns Array de imágenes de la orden
   */
  async execute(
    orderId: string,
    jwtPayload: JwtPayload,
  ): Promise<OrderImageDto[]> {
    this.logger.log(`Obteniendo imágenes de la orden ${orderId} para usuario: ${jwtPayload.sub}`);

    const imagesUrl = `/order/orders/${orderId}/images`;

    // Realizar petición autenticada a la API de Wispro
    const apiResponse: WisproOrderImagesApiResponse =
      await this.wisproApiClient.get<WisproOrderImagesApiResponse>(
        imagesUrl,
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
      `Imágenes obtenidas exitosamente: ${images.length} imágenes para la orden ${orderId}`,
    );

    return images;
  }
}

