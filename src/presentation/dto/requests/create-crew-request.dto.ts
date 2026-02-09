/**
 * Create Crew Request DTO
 * 
 * DTO para crear una nueva cuadrilla.
 */
import { IsString, IsNotEmpty, IsOptional, IsArray, ArrayMinSize, ValidateIf } from 'class-validator';

export class CreateCrewRequestDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  leaderTechnicianId: string;

  @IsArray()
  @ArrayMinSize(0)
  @IsString({ each: true })
  technicianIds: string[];
}

