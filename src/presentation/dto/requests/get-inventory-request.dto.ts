/**
 * Get Inventory Request DTO
 * 
 * DTO para los query parameters del endpoint de inventario.
 */
import { IsOptional, IsEnum, IsString } from 'class-validator';

export enum InventoryFilterType {
  WAREHOUSE = 'warehouse',
  TECHNICIAN = 'technician',
}

export enum StockStatus {
  LOW = 'low',        // Stock por debajo del mínimo (solo para bodega)
  NORMAL = 'normal',  // Stock normal (>= minStock o sin minStock)
  OUT_OF_STOCK = 'out_of_stock', // Stock = 0
}

export class GetInventoryRequestDto {
  /**
   * Filtro por tipo de ubicación
   * - 'warehouse': Solo bodega central
   * - 'technician': Solo técnicos
   * - Sin especificar: Todas las ubicaciones
   */
  @IsOptional()
  @IsEnum(InventoryFilterType)
  type?: InventoryFilterType;

  /**
   * ID de ubicación específica (opcional)
   * Si se especifica, solo devuelve el inventario de esa ubicación
   */
  @IsOptional()
  @IsString()
  locationId?: string;

  /**
   * Filtro por categoría del material
   */
  @IsOptional()
  @IsString()
  category?: string;

  /**
   * Filtro por estado del stock
   * - 'low': Stock por debajo del mínimo (solo para bodega)
   * - 'normal': Stock normal
   * - 'out_of_stock': Sin stock (stock = 0)
   */
  @IsOptional()
  @IsEnum(StockStatus)
  stockStatus?: StockStatus;

  /**
   * Búsqueda por nombre de material
   */
  @IsOptional()
  @IsString()
  search?: string;
}

