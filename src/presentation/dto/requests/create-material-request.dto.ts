/**
 * Create Material Request DTO
 * 
 * DTO para la creación de un nuevo material.
 * Soporta tanto JSON como multipart/form-data (para subir imágenes).
 */
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsNumber, Min, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateMaterialRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  unit: string; // Ej: "unidad", "metro", "kg", "litro"

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  })
  @IsNumber()
  @Min(0)
  minStock?: number = 0;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string = 'GENERAL';

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
}

