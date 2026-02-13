/**
 * Add Crew Member Request DTO
 * 
 * DTO para agregar un técnico a una cuadrilla.
 */
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AddCrewMemberRequestDto {
  @IsString()
  @IsNotEmpty()
  technicianId: string;

  @IsOptional()
  @IsString()
  role?: string;
}


