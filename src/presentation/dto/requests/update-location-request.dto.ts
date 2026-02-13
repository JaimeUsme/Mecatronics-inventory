/**
 * Update Location Request DTO
 * 
 * DTO para actualizar una ubicación existente.
 * Solo permite actualizar el nombre y el estado activo.
 * El tipo y referenceId no se pueden cambiar después de la creación.
 */
import { IsString, IsNotEmpty, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateLocationRequestDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  /**
   * Estado activo/inactivo de la ubicación.
   * Si se proporciona como string, se convierte a boolean.
   */
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    return Boolean(value);
  })
  @IsBoolean()
  active?: boolean;
}


