import { IsOptional, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetMaterialsRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  per_page?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  /**
   * Término de búsqueda opcional.
   * Busca por nombre o categoría del material.
   */
  @IsOptional()
  @IsString()
  search?: string;
}


