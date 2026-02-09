/**
 * Consume Materials Request DTO
 * 
 * DTO para la solicitud de consumo de múltiples materiales en una orden de servicio.
 * El consumo se asocia automáticamente al usuario/cuadrilla del JWT según el ownershipType de cada material.
 */
import { IsString, IsArray, ValidateNested, IsNumber, IsUUID, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class MaterialConsumptionDto {
  @IsUUID()
  materialId: string;

  @IsString()
  @IsOptional()
  materialName?: string; // Solo informativo, no se usa en backend

  @IsString()
  @IsOptional()
  materialUnit?: string; // Solo informativo, no se usa en backend

  @IsNumber()
  @Min(0)
  quantityUsed: number; // Cantidad usada/gastada

  @IsNumber()
  @Min(0)
  quantityDamaged: number; // Cantidad dañada
}

export class ConsumeMaterialsRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialConsumptionDto)
  materials: MaterialConsumptionDto[];

  @IsString()
  serviceOrderId: string; // ID de la orden de servicio de Wispro
}

