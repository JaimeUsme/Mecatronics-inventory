/**
 * Update Crew Request DTO
 * 
 * DTO para actualizar una cuadrilla existente.
 */
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateCrewRequestDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  leaderTechnicianId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

