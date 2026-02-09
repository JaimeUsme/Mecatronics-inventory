/**
 * Delete Order Image Use Case
 * 
 * Caso de uso que elimina una imagen de una orden en la API de Wispro.
 * Utiliza el cliente HTTP de Wispro para hacer la petición autenticada.
 */
import { Injectable, Logger } from '@nestjs/common';
import { WisproApiClientService } from '@infrastructure/external';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { OrderImageDto } from '@presentation/dto';
import { GetOrderImagesUseCase } from './get-order-images.use-case';

@Injectable()
export class DeleteOrderImageUseCase {
  private readonly logger = new Logger(DeleteOrderImageUseCase.name);

  constructor(
    private readonly wisproApiClient: WisproApiClientService,
    private readonly getOrderImagesUseCase: GetOrderImagesUseCase,
  ) {}

  /**
   * Ejecuta el caso de uso para eliminar una imagen de una orden
   * Las credenciales se obtienen del JWT token
   * Después de eliminar la imagen, obtiene la lista completa de imágenes
   * @param orderId - ID de la orden
   * @param imageId - ID de la imagen a eliminar
   * @param jwtPayload - Payload del JWT token con las credenciales de Wispro
   * @returns Lista completa de imágenes (sin la eliminada)
   */
  async execute(
    orderId: string,
    imageId: string,
    jwtPayload: JwtPayload,
  ): Promise<OrderImageDto[]> {
    this.logger.log(
      `Eliminando imagen ${imageId} de la orden ${orderId} para usuario: ${jwtPayload.sub}`,
    );

    const imageUrl = `/order/orders/${orderId}/images/${imageId}`;

    // Realizar petición DELETE autenticada a la API de Wispro
    await this.wisproApiClient.delete(
      imageUrl,
      {
        csrfToken: jwtPayload.csrfToken,
        sessionCookie: jwtPayload.sessionCookie,
        customReferer: 'https://cloud.wispro.co/order/orders?locale=es',
      },
    );

    this.logger.log(
      `Imagen ${imageId} eliminada exitosamente de la orden ${orderId}`,
    );

    // Después de eliminar la imagen, obtener la lista completa de imágenes
    const allImages = await this.getOrderImagesUseCase.execute(
      orderId,
      jwtPayload,
    );

    this.logger.log(
      `Lista de imágenes obtenida: ${allImages.length} imágenes para la orden ${orderId}`,
    );

    return allImages;
  }
}

