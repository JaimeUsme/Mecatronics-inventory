/**
 * Get Movements Request DTO
 * 
 * DTO para los parámetros de consulta del endpoint de movimientos.
 */
import { IsOptional, IsString, IsEnum, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { MovementType } from '@domain/enums';

export class GetMovementsRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  per_page?: number;

  @IsOptional()
  @IsString()
  materialId?: string;

  @IsOptional()
  @IsString()
  locationId?: string; // Filtrar por cualquier location (origen o destino)

  @IsOptional()
  @IsString()
  fromLocationId?: string; // Filtrar solo por location de origen

  @IsOptional()
  @IsString()
  toLocationId?: string; // Filtrar solo por location de destino

  @IsOptional()
  @IsString()
  technicianId?: string;

  @IsOptional()
  @IsEnum(MovementType)
  type?: MovementType;

  @IsOptional()
  @IsDateString()
  fromDate?: string; // Formato: YYYY-MM-DD o ISO 8601

  @IsOptional()
  @IsDateString()
  toDate?: string; // Formato: YYYY-MM-DD o ISO 8601
}

