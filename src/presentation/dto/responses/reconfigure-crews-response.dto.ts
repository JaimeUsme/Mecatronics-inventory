/**
 * Reconfigure Crews Response DTO
 * 
 * DTO para la respuesta de reconfiguración de cuadrillas.
 */
import { CrewDto } from './crew.dto';

export class MaterialMovementDto {
  materialId: string;
  materialName: string;
  fromCrewId: string;
  toCrewId: string;
  quantity: number;
  unit: string;
}

export class ReconfigureCrewsResponseDto {
  success: boolean;
  newCrews: CrewDto[];
  materialMovements: MaterialMovementDto[];
  deactivatedCrews: string[];
}

