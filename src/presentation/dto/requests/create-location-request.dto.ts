/**
 * Create Location Request DTO
 * 
 * DTO para la creación de una nueva ubicación.
 */
import { IsString, IsNotEmpty, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { LocationType } from '@domain/enums';

export class CreateLocationRequestDto {
  @IsEnum(LocationType)
  type: LocationType;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  referenceId?: string; // Para técnicos: el ID de Wispro

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;
}

