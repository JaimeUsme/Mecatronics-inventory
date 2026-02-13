/**
 * Service Order Material Repository Interface
 * 
 * Define el contrato para las operaciones de materiales de órdenes de servicio.
 */
import { ServiceOrderMaterial } from '@infrastructure/persistence/entities';

export interface IServiceOrderMaterialRepository {
  /**
   * Crea un registro de material consumido en una orden
   */
  create(material: Partial<ServiceOrderMaterial>): Promise<ServiceOrderMaterial>;

  /**
   * Obtiene los materiales de una orden de servicio
   */
  findByServiceOrder(serviceOrderId: string): Promise<ServiceOrderMaterial[]>;
}


