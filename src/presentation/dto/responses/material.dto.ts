/**
 * Material DTO
 * 
 * DTO para la respuesta de un material.
 */
import { MaterialOwnershipType } from '@domain/enums';

export class MaterialDto {
  id: string;
  name: string;
  unit: string;
  minStock: number;
  category: string;
  images?: string[] | null;
  ownershipType: MaterialOwnershipType; // TECHNICIAN o CREW
  createdAt: Date;
}

