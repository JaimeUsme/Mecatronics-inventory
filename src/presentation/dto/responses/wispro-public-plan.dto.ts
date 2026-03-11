/**
 * Wispro Public Plan DTO
 *
 * DTO que representa un plan disponible en la API pública de Wispro.
 * Contiene solo los campos necesarios para el cliente (id, name, public_id, price).
 */
export class WisproPublicPlanDto {
  id: string;
  name: string;
  public_id: number;
  price: number;
}
