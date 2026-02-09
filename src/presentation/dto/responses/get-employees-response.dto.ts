/**
 * Get Employees Response DTO
 * 
 * DTO que define la estructura de la respuesta del endpoint de empleados.
 * Contiene la lista de empleados con solo los campos solicitados.
 */
import { EmployeeDto } from './employee.dto';

export class PaginationDto {
  /**
   * Página actual
   */
  page: number;

  /**
   * Número de resultados por página
   */
  per_page: number;

  /**
   * Total de empleados
   */
  total?: number;

  /**
   * Total de páginas
   */
  total_pages?: number;
}

export class GetEmployeesResponseDto {
  /**
   * Lista de empleados con los campos: public_id, name, email, id, phone_mobile, roles
   */
  employees: EmployeeDto[];

  /**
   * Información de paginación
   * Incluye: página actual, resultados por página, total de empleados y total de páginas
   */
  pagination: PaginationDto;
}

