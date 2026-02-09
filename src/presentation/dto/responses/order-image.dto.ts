/**
 * Order Image DTO
 * 
 * DTO que representa una imagen de una orden.
 */
export class OrderImageDto {
  /**
   * ID de la imagen
   */
  id: string;

  /**
   * Fecha de creación
   */
  created_at: string;

  /**
   * Nombre del archivo
   */
  filename: string;

  /**
   * URL de la imagen original
   */
  original: string;

  /**
   * URL de la imagen en miniatura (thumb)
   */
  thumb: string;

  /**
   * URL de la imagen mini
   */
  mini: string;
}

