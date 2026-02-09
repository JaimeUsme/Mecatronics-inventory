/**
 * Inventory Response DTO
 * 
 * DTO para la respuesta de consulta de inventario.
 */
export class InventoryItemDto {
  materialId: string;
  materialName: string;
  materialCategory: string;
  materialImages?: string[] | null;
  unit: string;
  stock: number;
  minStock: number | null; // null para técnicos, valor numérico para bodega
  locationId: string;
  locationName: string;
  locationType: string;
  locationReferenceId?: string | null;
  lastUpdated?: Date | null;
}

export class InventoryResponseDto {
  items: InventoryItemDto[];
}

// Re-exportar DTOs de materiales y ubicaciones
export * from './material.dto';
export * from './location.dto';

