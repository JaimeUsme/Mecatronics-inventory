/**
 * Get Internal Users Request DTO
 * 
 * DTO para la consulta de usuarios internos con paginación.
 */
import { IsOptional, IsNumber, IsString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class GetInternalUsersRequestDto {
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
   * Busca por nombre o email del usuario.
   */
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * Filtrar por estado activo/inactivo.
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

