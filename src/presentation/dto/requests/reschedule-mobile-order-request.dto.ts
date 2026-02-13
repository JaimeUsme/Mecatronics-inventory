/**
 * Reschedule Mobile Order Request DTO
 * 
 * DTO que define el body para reagendar una orden móvil.
 */
export class RescheduleMobileOrderRequestDto {
  /**
   * Feedback con la razón del reagendamiento
   */
  feedback: {
    /**
     * Cuerpo del feedback explicando por qué se reagenda
     * @example "El usuario no está"
     */
    body: string;
  };
}

