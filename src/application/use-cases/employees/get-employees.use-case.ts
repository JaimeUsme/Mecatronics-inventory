/**
 * Get Employees Use Case
 *
 * Caso de uso que obtiene la lista de empleados desde la API de Wispro.
 * Utiliza el cliente HTTP de Wispro para hacer la petición autenticada.
 */
import { Injectable, Logger } from '@nestjs/common';
import { WisproApiWrapperService } from '@infrastructure/external';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { GetEmployeesRequestDto, GetEmployeesResponseDto } from '@presentation/dto';
import { mapWisproEmployeesToDto } from '@application/mappers';
import { TokenRefreshContextService } from '@application/services/token-refresh-context.service';

/**
 * Interfaz para la respuesta cruda de la API de Wispro
 * Wispro devuelve: [[empleados], {pagination: {total: X}}]
 */
type WisproEmployeesApiResponse = 
  | any[] // Array de arrays: [[empleados], {pagination}]
  | {
      employees?: any[];
      data?: any[];
      pagination?: { total?: number; total_pages?: number };
      total?: number;
      total_count?: number;
      total_pages?: number;
      [key: string]: any;
    };

@Injectable()
export class GetEmployeesUseCase {
  private readonly logger = new Logger(GetEmployeesUseCase.name);

  constructor(
    private readonly wisproApiClient: WisproApiWrapperService,
    private readonly tokenRefreshContext: TokenRefreshContextService,
  ) {}

  /**
   * Ejecuta el caso de uso para obtener la lista de empleados
   * Las credenciales se obtienen del JWT token
   * @param requestDto - Query parameters (per_page, page, react, search)
   * @param jwtPayload - Payload del JWT token con las credenciales de Wispro
   * @returns Lista de empleados mapeados con solo los campos solicitados
   */
  async execute(
    requestDto: GetEmployeesRequestDto,
    jwtPayload: JwtPayload,
  ): Promise<GetEmployeesResponseDto> {
    const hasSearch = !!requestDto.search && requestDto.search.trim().length > 0;
    const hasRoleFilter = !!requestDto.role_name && requestDto.role_name.trim().length > 0;
    
    if (hasSearch) {
      this.logger.log(`Buscando empleados con término: "${requestDto.search}" para usuario: ${jwtPayload.sub}`);
    } else if (hasRoleFilter) {
      this.logger.log(`Obteniendo empleados filtrados por rol: "${requestDto.role_name}" para usuario: ${jwtPayload.sub}`);
    } else {
      this.logger.log(`Obteniendo lista de empleados para usuario: ${jwtPayload.sub}`);
    }

    // Establecer valores por defecto
    const perPage = requestDto.per_page || 20;
    const page = requestDto.page || 1;
    const react = requestDto.react !== undefined ? requestDto.react : true;

    let allEmployeesArray: any[] = [];
    let totalFromApi: number | undefined = undefined;
    let totalPagesFromApi: number | undefined = undefined;

    // Si hay filtro por rol SIN búsqueda, necesitamos obtener TODAS las páginas
    // porque el filtrado se hace en memoria después de obtener los datos
    if (hasRoleFilter && !hasSearch) {
      let currentPage = 1;
      let hasMorePages = true;
      const maxPages = 100; // Límite de seguridad para evitar bucles infinitos

      while (hasMorePages && currentPage <= maxPages) {
        const response = await this.wisproApiClient.get<WisproEmployeesApiResponse>(
          '/employees',
          {
            csrfToken: jwtPayload.csrfToken,
            sessionCookie: jwtPayload.sessionCookie,
            userId: jwtPayload.sub, // Pasar userId para permitir token refresh automático
            queryParams: {
              per_page: 100, // Obtener más por página para reducir peticiones
              page: currentPage,
              react: react,
            },
            customReferer: 'https://cloud.wispro.co/employees?locale=es',
          },
        );

        // Capturar newJwt si ocurrió un refresco de token
        if (response.newJwt) {
          this.tokenRefreshContext.setNewJwt(response.newJwt);
        }

        const apiResponse = response.data;
        let employeesArray: any[] = [];
        let paginationInfo: any = null;

        if (Array.isArray(apiResponse)) {
          if (apiResponse.length > 0 && Array.isArray(apiResponse[0])) {
            employeesArray = apiResponse[0];
          }
          if (apiResponse.length > 1 && typeof apiResponse[1] === 'object' && apiResponse[1] !== null) {
            paginationInfo = apiResponse[1].pagination || apiResponse[1];
          }
        } else if (apiResponse && typeof apiResponse === 'object') {
          if (apiResponse.employees && Array.isArray(apiResponse.employees)) {
            employeesArray = apiResponse.employees;
          } else if (apiResponse.data && Array.isArray(apiResponse.data)) {
            employeesArray = apiResponse.data;
          } else {
            for (const key in apiResponse) {
              if (Array.isArray(apiResponse[key]) && key !== 'pagination') {
                employeesArray = apiResponse[key];
                break;
              }
            }
          }
          paginationInfo = apiResponse.pagination || apiResponse;
        }

        allEmployeesArray = allEmployeesArray.concat(employeesArray);

        // Obtener información de paginación de la primera página
        if (currentPage === 1) {
          totalFromApi = paginationInfo?.total || 
                        paginationInfo?.pagination?.total || 
                        (Array.isArray(apiResponse) ? undefined : (apiResponse.total || apiResponse.total_count)) || 
                        undefined;
          
          totalPagesFromApi = paginationInfo?.total_pages || 
                             paginationInfo?.pagination?.total_pages ||
                             (Array.isArray(apiResponse) ? undefined : apiResponse.total_pages) || 
                             undefined;
        }

        // Verificar si hay más páginas
        if (employeesArray.length === 0 || (totalPagesFromApi && currentPage >= totalPagesFromApi)) {
          hasMorePages = false;
        } else {
          currentPage++;
        }
      }

      this.logger.log(`Obtenidos ${allEmployeesArray.length} empleados de todas las páginas para filtrar por rol`);
    } else {
      // Caso normal: con búsqueda o sin filtro por rol
      let apiResponse: WisproEmployeesApiResponse;

      if (hasSearch) {
        // Para búsqueda, construir la URL manualmente para manejar el parámetro con corchetes
        const searchTerm = encodeURIComponent(requestDto.search.trim());
        const queryParams = new URLSearchParams();
        queryParams.append('per_page', String(perPage));
        queryParams.append('page', String(page));
        queryParams.append('react', String(react));
        // Agregar el parámetro de búsqueda con corchetes manualmente
        const searchUrl = `/employees?${queryParams.toString()}&q[name_or_user_email_or_phone_or_phone_mobile_unaccent_cont]=${searchTerm}`;

        const searchResponse = await this.wisproApiClient.get<WisproEmployeesApiResponse>(
          searchUrl,
          {
            csrfToken: jwtPayload.csrfToken,
            sessionCookie: jwtPayload.sessionCookie,
            userId: jwtPayload.sub, // Pasar userId para permitir token refresh automático
            customReferer: 'https://cloud.wispro.co/employees?locale=es',
          },
        );

        // Capturar newJwt si ocurrió un refresco de token
        if (searchResponse.newJwt) {
          this.tokenRefreshContext.setNewJwt(searchResponse.newJwt);
        }

        apiResponse = searchResponse.data;
      } else {
        // Usar endpoint normal de empleados sin búsqueda
        const normalResponse = await this.wisproApiClient.get<WisproEmployeesApiResponse>(
          '/employees',
          {
            csrfToken: jwtPayload.csrfToken,
            sessionCookie: jwtPayload.sessionCookie,
            userId: jwtPayload.sub, // Pasar userId para permitir token refresh automático
            queryParams: {
              per_page: perPage,
              page: page,
              react: react,
            },
            customReferer: 'https://cloud.wispro.co/employees?locale=es',
          },
        );

        // Capturar newJwt si ocurrió un refresco de token
        if (normalResponse.newJwt) {
          this.tokenRefreshContext.setNewJwt(normalResponse.newJwt);
        }

        apiResponse = normalResponse.data;
      }

      // Extraer el array de empleados de la respuesta
      let employeesArray: any[] = [];
      let paginationInfo: any = null;
      
      if (Array.isArray(apiResponse)) {
        if (apiResponse.length > 0 && Array.isArray(apiResponse[0])) {
          employeesArray = apiResponse[0];
        }
        if (apiResponse.length > 1 && typeof apiResponse[1] === 'object' && apiResponse[1] !== null) {
          paginationInfo = apiResponse[1].pagination || apiResponse[1];
        }
      } else if (apiResponse && typeof apiResponse === 'object') {
        if (apiResponse.employees && Array.isArray(apiResponse.employees)) {
          employeesArray = apiResponse.employees;
        } else if (apiResponse.data && Array.isArray(apiResponse.data)) {
          employeesArray = apiResponse.data;
        } else {
          for (const key in apiResponse) {
            if (Array.isArray(apiResponse[key]) && key !== 'pagination') {
              employeesArray = apiResponse[key];
              break;
            }
          }
        }
        paginationInfo = apiResponse.pagination || apiResponse;
      }

      allEmployeesArray = employeesArray;
      totalFromApi = paginationInfo?.total || 
                    paginationInfo?.pagination?.total || 
                    (Array.isArray(apiResponse) ? undefined : (apiResponse.total || apiResponse.total_count)) || 
                    undefined;
      
      totalPagesFromApi = paginationInfo?.total_pages || 
                         paginationInfo?.pagination?.total_pages ||
                         (Array.isArray(apiResponse) ? undefined : apiResponse.total_pages) || 
                         undefined;
    }

    // Mapear empleados a nuestro DTO con solo los campos solicitados
    let mappedEmployees = mapWisproEmployeesToDto(allEmployeesArray);

    // Aplicar filtro por nombre de rol (en memoria) si se solicitó
    if (hasRoleFilter) {
      const roleName = requestDto.role_name.trim().toLowerCase();
      mappedEmployees = mappedEmployees.filter((emp) =>
        (emp.roles || []).some((r) => (r.name || '').toLowerCase() === roleName),
      );
    }

    // Aplicar paginación en memoria si hay filtro por rol o si se obtuvo todo
    let paginatedEmployees = mappedEmployees;
    if (hasRoleFilter && !hasSearch) {
      // Cuando filtramos por rol sin búsqueda, aplicamos paginación en memoria
      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;
      paginatedEmployees = mappedEmployees.slice(startIndex, endIndex);
    }

    // Calcular totales
    const effectiveTotal = hasRoleFilter ? mappedEmployees.length : totalFromApi;
    const effectiveTotalPages =
      hasRoleFilter && effectiveTotal !== undefined
        ? Math.max(1, Math.ceil((effectiveTotal || 0) / perPage))
        : totalPagesFromApi;

    const response: GetEmployeesResponseDto = {
      employees: paginatedEmployees,
      pagination: {
        page,
        per_page: perPage,
        total: effectiveTotal,
        total_pages: effectiveTotalPages,
      },
    };

    if (hasSearch) {
      this.logger.log(
        `Búsqueda de empleados completada: ${paginatedEmployees.length} empleados encontrados para "${requestDto.search}" (página ${page})`,
      );
    } else if (hasRoleFilter) {
      this.logger.log(
        `Filtrado por rol completado: ${paginatedEmployees.length} empleados con rol "${requestDto.role_name}" (página ${page} de ${effectiveTotalPages})`,
      );
    } else {
      this.logger.log(
        `Lista de empleados obtenida exitosamente (página ${page}, ${paginatedEmployees.length} empleados)`,
      );
    }
    return response;
  }
}

