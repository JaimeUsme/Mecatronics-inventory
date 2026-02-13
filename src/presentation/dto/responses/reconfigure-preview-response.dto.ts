/**
 * Reconfigure Crews Preview Response DTO
 * 
 * DTO para la respuesta del preview de reconfiguración de cuadrillas.
 */
export class MaterialMovementPreviewDto {
  materialId: string;
  materialName: string;
  fromCrewId: string;
  fromCrewName: string;
  toCrewId: string | null; // null = bodega, "temp-0" = nueva cuadrilla 1, etc.
  toCrewName: string;
  quantity: number;
  unit: string;
}

export class ReconfigurePreviewSummaryDto {
  totalMaterialsToMove: number;
  totalQuantity: number;
  crewsAffected: number;
}

export class ReconfigurePreviewResponseDto {
  preview: {
    materialMovements: MaterialMovementPreviewDto[];
    summary: ReconfigurePreviewSummaryDto;
  };
  warnings?: string[];
}


