/**
 * Adjust Inventory Request DTO
 * 
 * DTO para ajustar el inventario (agregar stock inicial o hacer correcciones).
 */
import { IsString, IsNumber, IsUUID, Min } from 'class-validator';

export class AdjustInventoryRequestDto {
  @IsUUID()
  materialId: string;

  @IsUUID()
  locationId: string;

  @IsNumber()
  quantity: number; // Puede ser positivo (agregar) o negativo (quitar)
}

