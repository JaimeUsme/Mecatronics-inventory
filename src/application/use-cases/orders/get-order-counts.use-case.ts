/**
 * Get Order Counts Use Case
 *
 * Caso de uso que obtiene los conteos de órdenes por categoría desde la API de Wispro.
 * Realiza múltiples peticiones para obtener los totales de:
 * - Órdenes fallidas
 * - Órdenes exitosas
 * - Órdenes programadas
 * - Órdenes sin programar
 */
import { Injectable, Logger } from '@nestjs/common';
import { WisproApiWrapperService } from '@infrastructure/external';
import { TokenRefreshContextService } from '@application/services/token-refresh-context.service';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { OrderCountsResponseDto } from '@presentation/dto';

/**
 * Interfaz para la respuesta de conteos de Wispro
 */
type WisproOrderCountsResponse =
  | number // Puede devolver directamente un número
  | {
      total?: number;
      total_count?: number;
      count?: number;
      [key: string]: any;
    }
  | any[]; // O un array con información de paginación

@Injectable()
export class GetOrderCountsUseCase {
  private readonly logger = new Logger(GetOrderCountsUseCase.name);

  constructor(
    private readonly wisproApiClient: WisproApiWrapperService,
    private readonly tokenRefreshContext: TokenRefreshContextService,
  ) {}

  /**
   * Ejecuta el caso de uso para obtener los conteos de órdenes
   * @param jwtPayload - Payload del JWT token con las credenciales de Wispro
   * @param employeeId - ID del empleado opcional para filtrar por empleado específico
   * @param search - Término de búsqueda opcional por nombre o cédula del cliente
   * @returns Conteos de órdenes por categoría
   */
  async execute(
    jwtPayload: JwtPayload,
    employeeId?: string,
    search?: string,
  ): Promise<OrderCountsResponseDto> {
    if (employeeId) {
      this.logger.log(
        `Obteniendo conteos de órdenes para empleado: ${employeeId} (usuario: ${jwtPayload.sub})${search ? `, búsqueda: ${search}` : ''}`,
      );
      // Para empleado específico, usar el endpoint /counts con solo el filtro de empleado
      // El endpoint devuelve todos los conteos en una sola respuesta
      return this.getCountsForEmployee(jwtPayload, employeeId, search);
    } else {
      this.logger.log(`Obteniendo conteos de órdenes para usuario: ${jwtPayload.sub}${search ? `, búsqueda: ${search}` : ''}`);
      // Para todos los empleados, hacer peticiones separadas con los filtros
      return this.getCountsForAll(jwtPayload, search);
    }
  }

  /**
   * Obtiene los conteos para un empleado específico usando el endpoint /counts
   * @param jwtPayload - Payload del JWT token con las credenciales
   * @param employeeId - ID del empleado
   * @param search - Término de búsqueda opcional por nombre o cédula del cliente
   * @returns Conteos de órdenes por categoría
   */
  private async getCountsForEmployee(
    jwtPayload: JwtPayload,
    employeeId: string,
    search?: string,
  ): Promise<OrderCountsResponseDto> {
    // Construir la URL exactamente como lo requiere Wispro
    // /order/orders/counts?q[m]=and&q[groupings][0][employee_id_eq]=...&q[orderable_name_unaccent_cont]=...
    // No usar URLSearchParams porque codifica los corchetes, construir manualmente
    
    let url = `/order/orders/counts?q[m]=and&q[groupings][0][employee_id_eq]=${employeeId}`;
    
    // Si hay búsqueda, agregar el parámetro
    if (search && search.trim()) {
      let searchTerm = search.trim();
      
      // Intentar decodificar solo si es un URI válido
      try {
        // Si viene doble codificado (ej: JUAN%25CARLOS), decodificar primero
        if (searchTerm.includes('%25')) {
          searchTerm = decodeURIComponent(searchTerm);
        }
      } catch (e) {
        // Si falla la decodificación, usar el término original
        this.logger.debug(`No se pudo decodificar el término de búsqueda, usando original: ${searchTerm}`);
      }
      
      // Si el término tiene % pero no %20, reemplazar % con %20 (espacio codificado)
      if (searchTerm.includes('%') && !searchTerm.includes('%20')) {
        // Reemplazar % con %20 (espacio codificado)
        searchTerm = searchTerm.replace(/%/g, '%20');
      } else if (!searchTerm.includes('%')) {
        // Si no tiene %, codificar espacios normalmente
        searchTerm = encodeURIComponent(searchTerm);
      }
      
      // Agregar el parámetro de búsqueda manualmente (sin codificar el nombre del parámetro)
      url += `&q[orderable_name_unaccent_cont]=${searchTerm}`;
    }

    this.logger.debug(`Obteniendo conteos para empleado ${employeeId}${search ? ` con búsqueda "${search}"` : ''}: ${url}`);
    try {
      this.logger.debug(`URL decodificada: ${decodeURIComponent(url)}`);
    } catch (e) {
      this.logger.debug(`URL (no se pudo decodificar): ${url}`);
    }

    const wrappedResponse = await this.wisproApiClient.get<WisproOrderCountsResponse>(url, {
      csrfToken: jwtPayload.csrfToken,
      sessionCookie: jwtPayload.sessionCookie,
      customReferer: 'https://cloud.wispro.co/order/orders?locale=es',
      userId: jwtPayload.sub,
    });

    if (wrappedResponse.newJwt) {
      this.tokenRefreshContext.setNewJwt(wrappedResponse.newJwt);
    }

    const response = wrappedResponse.data;

    this.logger.debug(`Respuesta RAW de Wispro /counts (tipo: ${typeof response}): ${JSON.stringify(response, null, 2)}`);
    this.logger.debug(`Es array: ${Array.isArray(response)}`);
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      this.logger.debug(`Keys del objeto: ${Object.keys(response).join(', ')}`);
    }

    // El endpoint /counts devuelve un objeto con todos los conteos
    // Formato: { unscheduled_count, scheduled_count, success_count, failure_count, total_count }
    return this.extractCountsFromResponse(response);
  }

  /**
   * Obtiene los conteos para todos los empleados
   * Si hay búsqueda, usa el endpoint /counts directamente (más eficiente)
   * Si no hay búsqueda, hace peticiones separadas con los filtros
   * @param jwtPayload - Payload del JWT token con las credenciales
   * @param search - Término de búsqueda opcional por nombre o cédula del cliente
   * @returns Conteos de órdenes por categoría
   */
  private async getCountsForAll(
    jwtPayload: JwtPayload,
    search?: string,
  ): Promise<OrderCountsResponseDto> {
    // Si hay búsqueda, usar el endpoint /counts directamente (más eficiente y preciso)
    if (search && search.trim()) {
      return this.getCountsWithSearch(jwtPayload, search);
    }

    // Si no hay búsqueda, hacer peticiones separadas con los filtros
    const [failedCount, successCount, scheduledCount, unscheduledCount] =
      await Promise.all([
        this.getCount(
          { completed: true, failure: true },
          'fallidas',
          jwtPayload,
          undefined, // No hay search aquí
        ),
        this.getCount(
          { completed: true, success: true },
          'exitosas',
          jwtPayload,
          undefined, // No hay search aquí
        ),
        this.getCount(
          { in_progress: true, scheduled: true },
          'programadas',
          jwtPayload,
          undefined, // No hay search aquí
        ),
        this.getCount(
          { in_progress: true, unscheduled: true },
          'sin programar',
          jwtPayload,
          undefined, // No hay search aquí
        ),
      ]);

    const counts: OrderCountsResponseDto = {
      failed: failedCount,
      success: successCount,
      scheduled: scheduledCount,
      unscheduled: unscheduledCount,
    };

    this.logger.log(
      `Conteos obtenidos: Fallidas=${failedCount}, Exitosas=${successCount}, Programadas=${scheduledCount}, Sin programar=${unscheduledCount}`,
    );

    return counts;
  }

  /**
   * Obtiene los conteos usando el endpoint /counts con búsqueda
   * @param jwtPayload - Payload del JWT token con las credenciales
   * @param search - Término de búsqueda por nombre o cédula del cliente
   * @returns Conteos de órdenes por categoría
   */
  private async getCountsWithSearch(
    jwtPayload: JwtPayload,
    search: string,
  ): Promise<OrderCountsResponseDto> {
    // Construir la URL con el parámetro de búsqueda
    // /order/orders/counts?q[orderable_name_unaccent_cont]=...
    // No usar URLSearchParams porque codifica los corchetes, usar construcción manual
    let searchTerm = search.trim();
    
    // Intentar decodificar solo si es un URI válido
    try {
      // Si viene doble codificado (ej: JUAN%25CARLOS), decodificar primero
      if (searchTerm.includes('%25')) {
        searchTerm = decodeURIComponent(searchTerm);
      }
    } catch (e) {
      // Si falla la decodificación, usar el término original
      this.logger.debug(`No se pudo decodificar el término de búsqueda, usando original: ${searchTerm}`);
    }
    
    // Si el término tiene % pero no %20, reemplazar % con %20 (espacio codificado)
    if (searchTerm.includes('%') && !searchTerm.includes('%20')) {
      searchTerm = searchTerm.replace(/%/g, '%20');
    } else if (!searchTerm.includes('%')) {
      // Si no tiene %, codificar espacios normalmente
      searchTerm = encodeURIComponent(searchTerm);
    }
    
    // Construir la URL manualmente para evitar que URLSearchParams codifique los corchetes
    const url = `/order/orders/counts?q[orderable_name_unaccent_cont]=${searchTerm}`;

    this.logger.debug(`Obteniendo conteos con búsqueda "${search}": ${url}`);
    try {
      this.logger.debug(`URL decodificada: ${decodeURIComponent(url)}`);
    } catch (e) {
      this.logger.debug(`URL (no se pudo decodificar): ${url}`);
    }

    const wrappedResponse = await this.wisproApiClient.get<WisproOrderCountsResponse>(url, {
      csrfToken: jwtPayload.csrfToken,
      sessionCookie: jwtPayload.sessionCookie,
      customReferer: 'https://cloud.wispro.co/order/orders?locale=es',
      userId: jwtPayload.sub,
    });

    if (wrappedResponse.newJwt) {
      this.tokenRefreshContext.setNewJwt(wrappedResponse.newJwt);
    }

    const response = wrappedResponse.data;

    this.logger.debug(`Respuesta RAW de Wispro /counts (tipo: ${typeof response}): ${JSON.stringify(response, null, 2)}`);
    this.logger.debug(`Es array: ${Array.isArray(response)}`);
    if (response && typeof response === 'object' && !Array.isArray(response)) {
      this.logger.debug(`Keys del objeto: ${Object.keys(response).join(', ')}`);
    }

    // El endpoint /counts devuelve un objeto con todos los conteos
    // Formato: { unscheduled_count, scheduled_count, success_count, failure_count, total_count }
    return this.extractCountsFromResponse(response);
  }

  /**
   * Extrae los conteos de la respuesta del endpoint /counts
   * Wispro devuelve: { unscheduled_count, scheduled_count, success_count, failure_count, total_count }
   * @param response - Respuesta de Wispro
   * @returns Conteos de órdenes por categoría
   */
  private extractCountsFromResponse(
    response: WisproOrderCountsResponse,
  ): OrderCountsResponseDto {
    // Wispro devuelve: { unscheduled_count, scheduled_count, success_count, failure_count, total_count }
    let failed = 0;
    let success = 0;
    let scheduled = 0;
    let unscheduled = 0;

    this.logger.debug(
      `Respuesta completa de /counts (tipo: ${typeof response}, es array: ${Array.isArray(response)}): ${JSON.stringify(response, null, 2)}`,
    );

    if (response && typeof response === 'object' && !Array.isArray(response)) {
      // Extraer los campos con el formato exacto de Wispro
      // Wispro devuelve: { unscheduled_count, scheduled_count, success_count, failure_count, total_count }
      failed = Number(response.failure_count) || 0;
      success = Number(response.success_count) || 0;
      scheduled = Number(response.scheduled_count) || 0;
      unscheduled = Number(response.unscheduled_count) || 0;

      this.logger.debug(
        `Extraído de objeto: failure_count=${response.failure_count}, success_count=${response.success_count}, scheduled_count=${response.scheduled_count}, unscheduled_count=${response.unscheduled_count}`,
      );
    } else if (Array.isArray(response) && response.length > 0) {
      // Si es un array, buscar en el primer elemento
      const firstElement = response[0];
      if (firstElement && typeof firstElement === 'object') {
        failed = Number(firstElement.failure_count) || 0;
        success = Number(firstElement.success_count) || 0;
        scheduled = Number(firstElement.scheduled_count) || 0;
        unscheduled = Number(firstElement.unscheduled_count) || 0;

        this.logger.debug(
          `Extraído de array[0]: failure_count=${firstElement.failure_count}, success_count=${firstElement.success_count}, scheduled_count=${firstElement.scheduled_count}, unscheduled_count=${firstElement.unscheduled_count}`,
        );
      }
    } else {
      this.logger.warn(
        `Formato de respuesta inesperado de /counts: ${JSON.stringify(response)}`,
      );
    }

    this.logger.debug(
      `Conteos extraídos: Fallidas=${failed}, Exitosas=${success}, Programadas=${scheduled}, Sin programar=${unscheduled}`,
    );

    return {
      failed,
      success,
      scheduled,
      unscheduled,
    };
  }

  /**
   * Obtiene el conteo de órdenes con un filtro específico (solo para todos los empleados)
   * @param filters - Objeto con los filtros a aplicar (ej: { completed: true, failure: true })
   * @param categoryName - Nombre de la categoría para logging
   * @param jwtPayload - Payload del JWT token con las credenciales
   * @param search - Término de búsqueda opcional por nombre o cédula del cliente
   * @returns Total de órdenes que cumplen el filtro
   */
  private async getCount(
    filters: Record<string, boolean>,
    categoryName: string,
    jwtPayload: JwtPayload,
    search?: string,
  ): Promise<number> {
    try {
      // Para todos los empleados, usar el endpoint normal de órdenes con per_page=1
      // para obtener solo el total de la paginación
      const queryParams = new URLSearchParams();
      queryParams.append('per_page', '1');
      queryParams.append('page', '1');
      
      // Agregar los filtros directamente como q[filter_name]=true
      for (const [filterName, value] of Object.entries(filters)) {
        if (value === true) {
          queryParams.append(`q[${filterName}]`, 'true');
        }
      }
      
      // Construir la URL base con los query params normales
      let url = `/order/orders?${queryParams.toString()}`;
      
      // Si hay búsqueda, agregar el parámetro manualmente
      if (search && search.trim()) {
        // Wispro espera espacios codificados como %20
        let searchTerm = search.trim();
        
        if (searchTerm.includes('%') && !searchTerm.includes('%20')) {
          // Reemplazar % con %20 (espacio codificado)
          searchTerm = searchTerm.replace(/%/g, '%20');
        } else if (!searchTerm.includes('%')) {
          // Si no tiene %, codificar espacios normalmente
          searchTerm = encodeURIComponent(searchTerm);
        }
        
        // Agregar el parámetro de búsqueda manualmente (sin codificar el nombre)
        url += `&q[orderable_name_unaccent_cont]=${searchTerm}`;
      }

      this.logger.debug(
        `Obteniendo conteo de órdenes ${categoryName}: ${url}`,
      );

      const wrappedResponse = await this.wisproApiClient.get<WisproOrderCountsResponse>(url, {
        csrfToken: jwtPayload.csrfToken,
        sessionCookie: jwtPayload.sessionCookie,
        customReferer: 'https://cloud.wispro.co/order/orders?locale=es',
        userId: jwtPayload.sub,
      });

      if (wrappedResponse.newJwt) {
        this.tokenRefreshContext.setNewJwt(wrappedResponse.newJwt);
      }

      const response = wrappedResponse.data;

      // Extraer el total de la respuesta (misma estructura que get-orders.use-case.ts)
      let total = 0;

      if (Array.isArray(response)) {
        // Wispro devuelve un array de arrays: [[órdenes], {pagination: {...}}]
        if (response.length > 1 && typeof response[1] === 'object' && response[1] !== null) {
          const paginationInfo = response[1].pagination || response[1];
          total =
            paginationInfo.total ||
            paginationInfo.total_count ||
            0;
        }
      } else if (response && typeof response === 'object') {
        // Si es un objeto, buscar el total
        total =
          response.total ||
          response.total_count ||
          response.pagination?.total ||
          response.pagination?.total_count ||
          0;
      }

      this.logger.debug(
        `Conteo de órdenes ${categoryName}: ${total}`,
      );

      return total;
    } catch (error) {
      this.logger.error(
        `Error al obtener conteo de órdenes ${categoryName}: ${error.message}`,
      );
      // En caso de error, retornar 0 en lugar de fallar completamente
      return 0;
    }
  }
}

