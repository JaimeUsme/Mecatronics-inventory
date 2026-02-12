/**
 * Get Orders Request DTO
 * 
 * DTO que define los query parameters para el endpoint de órdenes.
 */
import { Transform } from 'class-transformer';

export class GetOrdersRequestDto {
  /**
   * Número de resultados por página
   * @default 20
   * @example 20
   */
  per_page?: number;

  /**
   * Número de página
   * @default 1
   * @example 1
   */
  page?: number;

  /**
   * Filtrar órdenes en progreso
   * @default false
   * @example true
   */
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === 'true' || lowerValue === '1') return true;
      if (lowerValue === 'false' || lowerValue === '0') return false;
    }
    if (typeof value === 'number') return value !== 0;
    return undefined;
  })
  in_progress?: boolean;

  /**
   * Filtrar órdenes programadas
   * @default false
   * @example true
   */
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === 'true' || lowerValue === '1') return true;
      if (lowerValue === 'false' || lowerValue === '0') return false;
    }
    if (typeof value === 'number') return value !== 0;
    return undefined;
  })
  scheduled?: boolean;

  /**
   * Filtrar órdenes completadas y exitosas
   * Cuando es true, aplica los filtros q[completed]=true&q[success]=true
   * @default false
   * @example true
   */
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === 'true' || lowerValue === '1') return true;
      if (lowerValue === 'false' || lowerValue === '0') return false;
    }
    if (typeof value === 'number') return value !== 0;
    return undefined;
  })
  completed?: boolean;

  /**
   * Filtrar órdenes por ID de empleado específico
   * @example "11b17a34-cd35-4c3c-9396-648d57408ab7"
   */
  employee_id?: string;

  /**
   * Buscar por nombre o cédula del cliente
   * Usa el parámetro q[orderable_name_unaccent_cont] de Wispro
   * @example "Jaime Usme"
   */
  search?: string;

  /**
   * Filtrar órdenes no programadas
   * Usa el parámetro q[unscheduled]=true de Wispro
   * @default false
   * @example true
   */
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === 'true' || lowerValue === '1') return true;
      if (lowerValue === 'false' || lowerValue === '0') return false;
    }
    if (typeof value === 'number') return value !== 0;
    return undefined;
  })
  unscheduled?: boolean;

  /**
   * Filtrar órdenes programadas
   * Usa el parámetro q[scheduled]=true de Wispro
   * @default false
   * @example true
   */
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === 'true' || lowerValue === '1') return true;
      if (lowerValue === 'false' || lowerValue === '0') return false;
    }
    if (typeof value === 'number') return value !== 0;
    return undefined;
  })
  scheduled_state?: boolean;

  /**
   * Filtrar órdenes exitosas
   * Usa el parámetro q[success]=true de Wispro
   * @default false
   * @example true
   */
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === 'true' || lowerValue === '1') return true;
      if (lowerValue === 'false' || lowerValue === '0') return false;
    }
    if (typeof value === 'number') return value !== 0;
    return undefined;
  })
  success?: boolean;

  /**
   * Filtrar órdenes fallidas
   * Usa el parámetro q[failure]=true de Wispro
   * @default false
   * @example true
   */
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === 'true' || lowerValue === '1') return true;
      if (lowerValue === 'false' || lowerValue === '0') return false;
    }
    if (typeof value === 'number') return value !== 0;
    return undefined;
  })
  failure?: boolean;
}

