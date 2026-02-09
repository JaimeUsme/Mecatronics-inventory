/**
 * Inventory Movement DTO
 * 
 * DTO para representar un movimiento de inventario con información completa.
 */
import { MovementType, ConsumptionType } from '@domain/enums';

export class InventoryMovementDto {
  id: string;
  materialId: string;
  materialName: string;
  materialCategory: string;
  materialUnit: string;
  fromLocationId: string | null;
  fromLocationName: string | null;
  toLocationId: string | null;
  toLocationName: string | null;
  quantity: number;
  type: MovementType;
  serviceOrderId: string | null;
  technicianId: string | null;
  consumptionType?: ConsumptionType; // Solo para movimientos de tipo CONSUMPTION: indica si fue USED o DAMAGED. Los movimientos de tipo DAMAGED no tienen este campo.
  createdAt: Date;
}

export class GetMovementsResponseDto {
  movements: InventoryMovementDto[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

