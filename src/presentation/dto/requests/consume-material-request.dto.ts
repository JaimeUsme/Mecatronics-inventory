/**
 * Consume Material Request DTO
 * 
 * DTO para la solicitud de consumo de material en una orden de servicio.
 * 
 * NOTA: technicianLocationId es opcional. Si no se proporciona, se buscará
 * automáticamente la Location del técnico usando technicianId.
 */
import { IsString, IsNumber, IsUUID, Min, IsEnum, IsOptional } from 'class-validator';
import { ConsumptionType } from '@domain/enums';

export class ConsumeMaterialRequestDto {
  @IsUUID()
  materialId: string;

  @IsUUID()
  @IsOptional()
  technicianLocationId?: string; // Opcional: si no se proporciona, se busca automáticamente por technicianId

  @IsNumber()
  @Min(0.01)
  quantity: number;

  @IsString()
  serviceOrderId: string;

  @IsString()
  technicianId: string; // Se usa para buscar la Location si technicianLocationId no se proporciona

  @IsEnum(ConsumptionType)
  @IsOptional()
  consumptionType?: ConsumptionType; // Opcional, por defecto USED
}

