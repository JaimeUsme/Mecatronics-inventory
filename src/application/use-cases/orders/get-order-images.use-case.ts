/**
 * Get Order Images Use Case
 *
 * Caso de uso que obtiene las imágenes de una orden desde la API de Wispro.
 * Utiliza el cliente HTTP de Wispro para hacer la petición autenticada.
 */
import { Injectable, Logger } from '@nestjs/common';
import { WisproApiWrapperService } from '@infrastructure/external';
import { TokenRefreshContextService } from '@application/services/token-refresh-context.service';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { OrderImageDto, GetOrderImagesResponseDto } from '@presentation/dto';

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

  constructor(
    private readonly wisproApiClient: WisproApiWrapperService,
    private readonly tokenRefreshContext: TokenRefreshContextService,
  ) {}

  /**
   * Ejecuta el caso de uso para obtener las imágenes de una orden
   * Las credenciales se obtienen del JWT token
   * Separa las imágenes normales de las firmas (filename que empieza con 'sign-')
   * @param orderId - ID de la orden
   * @param jwtPayload - Payload del JWT token con las credenciales de Wispro
   * @returns Objeto con imágenes normales y firma separadas
   */
  async execute(
    orderId: string,
    jwtPayload: JwtPayload,
  ): Promise<GetOrderImagesResponseDto> {
    this.logger.log(`Obteniendo imágenes de la orden ${orderId} para usuario: ${jwtPayload.sub}`);

    const imagesUrl = `/order/orders/${orderId}/images`;

    // Realizar petición autenticada a la API de Wispro
    const wrappedResponse = await this.wisproApiClient.get<WisproOrderImagesApiResponse>(
      imagesUrl,
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

    const apiResponse = wrappedResponse.data;

    // Mapear respuesta de la API a nuestro DTO
    const allImages: OrderImageDto[] = (Array.isArray(apiResponse) ? apiResponse : []).map(
      (image) => ({
        id: image.id || '',
        created_at: image.created_at || '',
        filename: image.filename || '',
        original: image.original || '',
        thumb: image.thumb || '',
        mini: image.mini || '',
      }),
    );

    // Separar imágenes normales de firmas
    const sign = allImages.find((img) => img.filename.startsWith('sign-')) || null;
    const images = allImages.filter((img) => !img.filename.startsWith('sign-'));

    this.logger.log(
      `Imágenes obtenidas exitosamente: ${images.length} imágenes normales, ${sign ? '1' : '0'} firma(s) para la orden ${orderId}`,
    );

    return {
      images,
      sign,
    };
  }
}

