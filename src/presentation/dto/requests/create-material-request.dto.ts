/**
 * Create Material Request DTO
 * 
 * DTO para la creación de un nuevo material.
 */
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsNumber, Min, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

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
  @Type(() => Number)
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
  images?: string[]; // Array de rutas/URLs de imágenes
}

