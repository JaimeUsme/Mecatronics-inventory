/**
 * Get Locations Request DTO
 * 
 * DTO para los parámetros de consulta del endpoint de ubicaciones.
 */
import { IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { LocationType } from '@domain/enums';

export class GetLocationsRequestDto {
  /**
   * Filtro por tipo de ubicación
   * - WAREHOUSE: solo bodegas
   * - TECHNICIAN: solo ubicaciones de técnicos
   * - CREW: solo ubicaciones de cuadrillas
   * - undefined: todos los tipos
   */
  @IsOptional()
  @IsEnum(LocationType)
  type?: LocationType;

  /**
   * Filtro por estado activo/inactivo
   * - true: solo ubicaciones activas
   * - false: solo ubicaciones inactivas
   * - undefined: todas las ubicaciones
   */
  @IsOptional()
  @Transform(({ value }) => {
    // Si el valor es undefined, null o string vacío, retornar undefined
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    
    // Si ya es boolean, retornarlo tal cual
    if (typeof value === 'boolean') {
      return value;
    }
    
    // Convertir string a boolean
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === 'true' || lowerValue === '1') return true;
      if (lowerValue === 'false' || lowerValue === '0') return false;
    }
    
    // Si es número, convertir
    if (typeof value === 'number') {
      return value !== 0;
    }
    
    return undefined;
  })
  @IsOptional()
  @IsBoolean({ message: 'active debe ser un valor booleano (true o false)' })
  active?: boolean;
}

