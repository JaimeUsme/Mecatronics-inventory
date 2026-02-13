/**
 * Location Repository Interface
 * 
 * Define el contrato para las operaciones de ubicaciones.
 */
import { Location } from '@infrastructure/persistence/entities';
import { LocationType } from '@domain/enums';

export interface ILocationRepository {
  /**
   * Obtiene una ubicación por ID
   */
  findById(id: string): Promise<Location | null>;

  /**
   * Obtiene la bodega central (WAREHOUSE)
   */
  findWarehouse(): Promise<Location | null>;

  /**
   * Obtiene la ubicación de un técnico por su referenceId
   */
  findByTechnicianId(technicianId: string): Promise<Location | null>;

  /**
   * Crea o obtiene la ubicación de un técnico
   */
  findOrCreateTechnicianLocation(technicianId: string, technicianName: string): Promise<Location>;

  /**
   * Crea una nueva ubicación
   */
  create(location: Partial<Location>): Promise<Location>;
}


