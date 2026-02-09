/**
 * Transfer Material Request DTO
 * 
 * DTO para la solicitud de transferencia de material entre ubicaciones.
 * Permite transferir entre: bodega, técnico, cuadrilla.
 */
import { IsString, IsNumber, IsUUID, Min, IsOptional } from 'class-validator';

export class TransferMaterialRequestDto {
  @IsUUID()
  materialId: string;

  @IsUUID()
  fromLocationId: string; // Ubicación origen (bodega, técnico o cuadrilla)

  @IsUUID()
  toLocationId: string; // Ubicación destino (bodega, técnico o cuadrilla)

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  damagedQuantity?: number; // Opcional: cantidad de material que se dañó durante la transferencia

  @IsOptional()
  @IsString()
  technicianId?: string; // Opcional: ID del técnico que realiza la transferencia
}

