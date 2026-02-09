/**
 * Location DTO
 * 
 * DTO para la respuesta de una ubicación.
 */
import { LocationType } from '@domain/enums';

export class LocationDto {
  id: string;
  type: LocationType;
  referenceId: string | null;
  name: string;
  active: boolean;
  createdAt: Date;
}

