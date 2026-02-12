/**
 * Get Internal Users Response DTO
 * 
 * DTO para la respuesta de la consulta de usuarios internos.
 */
import { InternalUserDto } from './internal-user.dto';
import { PaginationDto } from './get-employees-response.dto';

export class InternalUsersStatsDto {
  /**
   * Total de usuarios internos
   */
  total: number;

  /**
   * Cantidad de usuarios activos
   */
  active: number;

  /**
   * Cantidad de usuarios inactivos
   */
  inactive: number;
}

export class GetInternalUsersResponseDto {
  /**
   * Lista de usuarios internos
   */
  users: InternalUserDto[];

  /**
   * Información de paginación
   */
  pagination: PaginationDto;

  /**
   * Estadísticas de usuarios
   */
  stats: InternalUsersStatsDto;
}

