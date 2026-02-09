/**
 * Inventory Stats Response DTO
 * 
 * DTO para la respuesta de estadísticas del inventario.
 */
export class InventoryStatsResponseDto {
  /**
   * Total de materiales registrados en el sistema
   */
  totalMaterials: number;

  /**
   * Total de ubicaciones (bodega + técnicos)
   */
  totalLocations: number;

  /**
   * Total de registros de inventario con stock por debajo del mínimo (solo bodega)
   */
  lowStockCount: number;

  /**
   * Cantidad de materiales sin stock en bodega
   */
  warehouseOutOfStockCount: number;
}

