/**
 * Get Order Images Response DTO
 * 
 * DTO que define la estructura de la respuesta del endpoint de imágenes de una orden.
 * Separa las imágenes normales de las firmas.
 */
import { OrderImageDto } from './order-image.dto';

export class GetOrderImagesResponseDto {
  /**
   * Imágenes normales (no son firmas)
   */
  images: OrderImageDto[];

  /**
   * Imagen de firma (filename que empieza con 'sign-')
   * Puede ser null si no hay firma
   */
  sign: OrderImageDto | null;
}

