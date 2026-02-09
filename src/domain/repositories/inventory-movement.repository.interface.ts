/**
 * Inventory Movement Repository Interface
 * 
 * Define el contrato para las operaciones de movimientos de inventario.
 */
import { InventoryMovement } from '@infrastructure/persistence/entities';
import { MovementType } from '@domain/enums';

export interface IInventoryMovementRepository {
  /**
   * Crea un nuevo movimiento de inventario
   */
  create(movement: Partial<InventoryMovement>): Promise<InventoryMovement>;

  /**
   * Obtiene los movimientos de un material
   */
  findByMaterial(materialId: string): Promise<InventoryMovement[]>;

  /**
   * Obtiene los movimientos de una orden de servicio
   */
  findByServiceOrder(serviceOrderId: string): Promise<InventoryMovement[]>;

  /**
   * Obtiene los movimientos de un técnico
   */
  findByTechnician(technicianId: string): Promise<InventoryMovement[]>;
}

