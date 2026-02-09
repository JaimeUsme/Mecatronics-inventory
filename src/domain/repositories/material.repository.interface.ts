/**
 * Material Repository Interface
 * 
 * Define el contrato para las operaciones de materiales.
 */
import { Material } from '@infrastructure/persistence/entities';

export interface IMaterialRepository {
  /**
   * Obtiene un material por ID
   */
  findById(id: string): Promise<Material | null>;

  /**
   * Obtiene todos los materiales
   */
  findAll(): Promise<Material[]>;

  /**
   * Crea un nuevo material
   */
  create(material: Partial<Material>): Promise<Material>;
}

