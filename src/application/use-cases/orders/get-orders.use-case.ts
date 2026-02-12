/**
 * Get Orders Use Case
 * 
 * Caso de uso que obtiene la lista de órdenes desde la API de Wispro.
 * Utiliza el cliente HTTP de Wispro para hacer la petición autenticada.
 */
import { Injectable, Logger } from '@nestjs/common';
import { WisproApiClientService } from '@infrastructure/external';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { GetOrdersRequestDto, GetOrdersResponseDto } from '@presentation/dto';
import { mapWisproOrdersToDto } from '@application/mappers';
import { OrderCrewSnapshotService } from '@application/services/orders/order-crew-snapshot.service';

/**
 * Interfaz para la respuesta cruda de la API de Wispro
 * Wispro devuelve: [[órdenes], {pagination: {total: X, total_count: Y, more: Z}}]
 */
type WisproOrdersApiResponse =
  | any[] // Array de arrays: [[órdenes], {pagination}]
  | {
      orders?: any[];
      data?: any[];
      pagination?: { total?: number; total_count?: number; more?: boolean };
      total?: number;
      total_count?: number;
      [key: string]: any;
    };

@Injectable()
export class GetOrdersUseCase {
  private readonly logger = new Logger(GetOrdersUseCase.name);

  constructor(
    private readonly wisproApiClient: WisproApiClientService,
    private readonly orderCrewSnapshotService: OrderCrewSnapshotService,
  ) {}

  /**
   * Ejecuta el caso de uso para obtener la lista de órdenes
   * Las credenciales se obtienen del JWT token
   * @param requestDto - Query parameters (per_page, page, in_progress, scheduled, employee_id)
   * @param jwtPayload - Payload del JWT token con las credenciales de Wispro
   * @returns Lista de órdenes mapeadas con solo los campos solicitados
   */
  async execute(
    requestDto: GetOrdersRequestDto,
    jwtPayload: JwtPayload,
  ): Promise<GetOrdersResponseDto> {
    const hasEmployeeFilter = !!requestDto.employee_id;
    
    if (hasEmployeeFilter) {
      this.logger.log(`Obteniendo lista de órdenes para empleado: ${requestDto.employee_id} (usuario: ${jwtPayload.sub})`);
    } else {
      this.logger.log(`Obteniendo lista de órdenes para usuario: ${jwtPayload.sub}`);
    }

    // Establecer valores por defecto
    const perPage = requestDto.per_page || 20;
    const page = requestDto.page || 1;
    const inProgress = requestDto.in_progress !== undefined ? requestDto.in_progress : false;
    const scheduled = requestDto.scheduled !== undefined ? requestDto.scheduled : false;
    const completed = requestDto.completed !== undefined ? requestDto.completed : false;

    // Construir query params para Wispro
    // Según la lógica de Wispro:
    // - Failed: q[completed]=true&q[failure]=true
    // - Success: q[completed]=true&q[success]=true
    // - Programadas: q[in_progress]=true&q[scheduled]=true
    // - No programadas: q[in_progress]=true&q[unscheduled]=true
    const queryParams = new URLSearchParams();
    queryParams.append('per_page', String(perPage));
    queryParams.append('page', String(page));
    
    // Filtros de estado según la lógica de Wispro
    // Programadas: q[in_progress]=true&q[scheduled]=true
    if (requestDto.scheduled_state === true) {
      queryParams.append('q[in_progress]', 'true');
      queryParams.append('q[scheduled]', 'true');
    }
    
    // No programadas: q[in_progress]=true&q[unscheduled]=true
    if (requestDto.unscheduled === true) {
      queryParams.append('q[in_progress]', 'true');
      queryParams.append('q[unscheduled]', 'true');
    }
    
    // Success: q[completed]=true&q[success]=true
    if (requestDto.success === true) {
      queryParams.append('q[completed]', 'true');
      queryParams.append('q[success]', 'true');
    }
    
    // Failure: q[completed]=true&q[failure]=true
    if (requestDto.failure === true) {
      this.logger.debug(`Adding failure filter: q[completed]=true&q[failure]=true`);
      queryParams.append('q[completed]', 'true');
      queryParams.append('q[failure]', 'true');
    } else {
      this.logger.debug(`Failure filter not applied. requestDto.failure = ${requestDto.failure} (type: ${typeof requestDto.failure})`);
    }
    
    // Filtros básicos (solo si no se usan los filtros específicos arriba)
    if (inProgress && !requestDto.scheduled_state && !requestDto.unscheduled) {
      queryParams.append('q[in_progress]', 'true');
    }
    if (scheduled && !requestDto.scheduled_state) {
      queryParams.append('q[scheduled]', 'true');
    }
    if (completed && !requestDto.success && !requestDto.failure) {
      queryParams.append('q[completed]', 'true');
      queryParams.append('q[success]', 'true');
    }

    // Si se proporciona employee_id, agregar los parámetros de filtro por empleado
    if (hasEmployeeFilter) {
      queryParams.append('q[m]', 'and');
      queryParams.append('q[groupings][0][employee_id_eq]', requestDto.employee_id!);
    }

    // Construir la URL base con los query params normales
    let ordersUrl = `/order/orders?${queryParams.toString()}`;
    this.logger.debug(`Orders URL constructed: ${ordersUrl}`);
    
    // Búsqueda por nombre o cédula del cliente
    // Wispro espera espacios codificados como %20
    // Si el frontend envía JUAN%CARLOS, reemplazar % con %20
    if (requestDto.search && requestDto.search.trim()) {
      let searchTerm = requestDto.search.trim();
      
      // Si el frontend envía JUAN%CARLOS (con % literal), reemplazar % con %20
      if (searchTerm.includes('%') && !searchTerm.includes('%20')) {
        // Reemplazar % con %20 (espacio codificado)
        searchTerm = searchTerm.replace(/%/g, '%20');
      } else if (!searchTerm.includes('%')) {
        // Si no tiene %, codificar espacios normalmente
        searchTerm = encodeURIComponent(searchTerm);
      }
      
      // Agregar el parámetro de búsqueda manualmente (sin codificar el nombre)
      // Esto es como se hace en get-employees.use-case.ts
      ordersUrl += `&q[orderable_name_unaccent_cont]=${searchTerm}`;
    }

    // Realizar petición autenticada a la API de Wispro
    const apiResponse: WisproOrdersApiResponse =
      await this.wisproApiClient.get<WisproOrdersApiResponse>(
        ordersUrl,
        {
          csrfToken: jwtPayload.csrfToken,
          sessionCookie: jwtPayload.sessionCookie,
          customReferer: 'https://cloud.wispro.co/order/orders?locale=es',
        },
      );

    // Extraer el array de órdenes de la respuesta
    // Según la estructura real de Wispro: [[órdenes], {pagination: {total: X, total_count: Y, more: Z}}]
    let ordersArray: any[] = [];
    let paginationInfo: any = null;

    if (Array.isArray(apiResponse)) {
      // Wispro devuelve un array de arrays: [[órdenes], {pagination: {...}}]
      if (apiResponse.length > 0 && Array.isArray(apiResponse[0])) {
        ordersArray = apiResponse[0];
      }
      if (apiResponse.length > 1 && typeof apiResponse[1] === 'object' && apiResponse[1] !== null) {
        // La paginación puede estar en apiResponse[1].pagination o directamente en apiResponse[1]
        paginationInfo = apiResponse[1].pagination || apiResponse[1];
      }
    } else if (apiResponse && typeof apiResponse === 'object') {
      // Si es un objeto, buscar el array de órdenes
      if (apiResponse.orders && Array.isArray(apiResponse.orders)) {
        ordersArray = apiResponse.orders;
      } else if (apiResponse.data && Array.isArray(apiResponse.data)) {
        ordersArray = apiResponse.data;
      } else {
        // Buscar cualquier propiedad que sea un array
        for (const key in apiResponse) {
          if (Array.isArray(apiResponse[key]) && key !== 'pagination') {
            ordersArray = apiResponse[key];
            break;
          }
        }
      }
      paginationInfo = apiResponse.pagination || apiResponse;
    }

    // Mapear órdenes a nuestro DTO con solo los campos solicitados
    const mappedOrders = mapWisproOrdersToDto(ordersArray);

    // Obtener snapshots existentes de cuadrillas para cada orden y agregar la información
    // NOTA: Los snapshots solo se crean cuando se consume material por primera vez, no aquí
    for (const order of mappedOrders) {
      if (order.employee_id) {
        try {
          // Solo obtener snapshot existente, no crear uno nuevo
          const snapshot = await this.orderCrewSnapshotService.getSnapshot(order.id);

          if (snapshot) {
            order.crew_snapshot = {
              crew_id: snapshot.crewId,
              crew_name: snapshot.crewName,
              member_ids: snapshot.crewMemberIds || [],
              members: (snapshot.crewMembers || []).map((m) => ({
                technician_id: m.technicianId,
                role: m.role,
              })),
            };
          } else {
            order.crew_snapshot = null;
          }
        } catch (error) {
          this.logger.warn(
            `Error al obtener snapshot de cuadrilla para orden ${order.id}: ${error.message}`,
          );
          order.crew_snapshot = null;
        }
      } else {
        order.crew_snapshot = null;
      }
    }

    // Extraer información de paginación de múltiples posibles ubicaciones
    const total = paginationInfo?.total || 
                  paginationInfo?.pagination?.total || 
                  (Array.isArray(apiResponse) ? undefined : (apiResponse.total || apiResponse.total_count)) || 
                  undefined;
    
    const totalCount = paginationInfo?.total_count || 
                       paginationInfo?.pagination?.total_count ||
                       (Array.isArray(apiResponse) ? undefined : apiResponse.total_count) || 
                       undefined;

    // Calcular total_pages basado en total_count y per_page
    const totalPages = totalCount && perPage ? Math.ceil(totalCount / perPage) : undefined;

    // Construir respuesta con paginación completa
    const response: GetOrdersResponseDto = {
      orders: mappedOrders,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
      },
    };

    if (hasEmployeeFilter) {
      this.logger.log(
        `Lista de órdenes obtenida exitosamente para empleado ${requestDto.employee_id} (página ${page}, ${mappedOrders.length} órdenes)`,
      );
    } else {
      this.logger.log(
        `Lista de órdenes obtenida exitosamente (página ${page}, ${mappedOrders.length} órdenes)`,
      );
    }
    return response;
  }
}

