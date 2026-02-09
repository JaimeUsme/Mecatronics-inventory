/**
 * Get Crews Request DTO
 * 
 * DTO para los parámetros de consulta del endpoint de cuadrillas.
 */
import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetCrewsRequestDto {
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}

