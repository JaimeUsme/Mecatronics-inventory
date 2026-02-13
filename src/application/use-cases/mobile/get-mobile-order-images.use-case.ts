/**
 * Get Mobile Order Images Use Case
 * 
 * Caso de uso que obtiene las imágenes de una orden desde la API móvil de Wispro.
 * Utiliza el cliente HTTP móvil de Wispro para hacer la petición autenticada.
 * Separa las imágenes normales de las firmas (filename que empieza con 'sign-').
 */
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WisproMobileApiClientService } from '@infrastructure/external/wispro/wispro-mobile-api-client.service';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { OrderImageDto, GetOrderImagesResponseDto } from '@presentation/dto';

/**
 * Interfaz para la respuesta cruda de la API móvil de Wispro
 * Wispro devuelve un array de imágenes
 */
type WisproMobileOrderImagesApiResponse = Array<{
  id: string;
  created_at: string;
  filename: string;
  original: string;
  thumb: string;
  mini: string;
}>;

@Injectable()
export class GetMobileOrderImagesUseCase {
  private readonly logger = new Logger(GetMobileOrderImagesUseCase.name);

  constructor(
    private readonly wisproMobileApiClient: WisproMobileApiClientService,
  ) {}

  /**
   * Ejecuta el caso de uso para obtener las imágenes de una orden móvil
   * Las credenciales se obtienen del JWT token
   * Separa las imágenes normales de las firmas (filename que empieza con 'sign-')
   * @param orderId - ID de la orden
   * @param jwtPayload - Payload del JWT token con el token de Wispro mobile
   * @returns Objeto con imágenes normales y firma separadas
   */
  async execute(
    orderId: string,
    jwtPayload: JwtPayload,
  ): Promise<GetOrderImagesResponseDto> {
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
      `Obteniendo imágenes de la orden móvil ${orderId} para usuario: ${jwtPayload.sub}`,
    );

    // Llamar a la API móvil de Wispro
    const apiResponse: WisproMobileOrderImagesApiResponse =
      await this.wisproMobileApiClient.getOrderImages(authToken, orderId);

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
      `Imágenes obtenidas exitosamente: ${images.length} imágenes normales, ${sign ? '1' : '0'} firma(s) para la orden móvil ${orderId}`,
    );

    return {
      images,
      sign,
    };
  }
}

