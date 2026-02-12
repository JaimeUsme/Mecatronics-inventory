/**
 * Update Material Request DTO
 * 
 * DTO para la actualización de un material existente.
 * Soporta tanto JSON como multipart/form-data (para subir imágenes).
 * Todos los campos son opcionales - solo se actualizan los que se proporcionen.
 */
import { IsString, IsOptional, MaxLength, IsNumber, Min, IsArray, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { MaterialOwnershipType } from '@domain/enums';

export class UpdateMaterialRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  unit?: string; // Ej: "unidad", "metro", "kg", "litro"

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
  })
  @IsNumber()
  @Min(0)
  minStock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    // Si viene como string (multipart/form-data), intentar parsearlo como JSON
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return [value]; // Si no es JSON válido, tratarlo como un solo string
      }
    }
    return value;
  })
  images?: string[]; // Array de rutas/URLs de imágenes (opcional, también se pueden subir como archivos)

  @IsOptional()
  @IsEnum(MaterialOwnershipType)
  ownershipType?: MaterialOwnershipType; // TECHNICIAN o CREW
}

