/**
 * Reconnect Wispro Response DTO
 *
 * DTO para la respuesta del endpoint de reconexión de Wispro.
 */
export class ReconnectWisproResponseDto {
  /**
   * Nuevo accessToken con credenciales de Wispro incluidas.
   * Será null si la reconexión falló.
   */
  accessToken: string | null;

  /**
   * Indica si la reconexión fue exitosa.
   */
  success: boolean;

  /**
   * Mensaje opcional con información adicional.
   */
  message?: string;
}

