/**
 * Inventory Repository Interface
 * 
 * Define el contrato para las operaciones de inventario.
 * Esta interfaz pertenece a la capa de dominio (independiente de la implementación).
 */
import { Inventory } from '@infrastructure/persistence/entities';
import { LocationType } from '@domain/enums';

export interface IInventoryRepository {
  /**
   * Obtiene el inventario de un material en una ubicación específica
   */
  findByMaterialAndLocation(materialId: string, locationId: string): Promise<Inventory | null>;

  /**
   * Obtiene todos los inventarios de una ubicación
   */
  findByLocation(locationId: string): Promise<Inventory[]>;

  /**
   * Obtiene todos los inventarios de bodegas (WAREHOUSE)
   */
  findWarehouseInventories(): Promise<Inventory[]>;

  /**
   * Crea o actualiza un inventario
   */
  save(inventory: Inventory): Promise<Inventory>;

  /**
   * Actualiza múltiples inventarios en una transacción
   */
  saveMany(inventories: Inventory[]): Promise<Inventory[]>;
}

