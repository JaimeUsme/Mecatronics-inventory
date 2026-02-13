/**
 * Close Order Use Case
 * 
 * Caso de uso que cierra una orden en la API de Wispro.
 * Cierra el ticket asociado a la orden cambiando su estado a "closed".
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WisproApiClientService } from '@infrastructure/external';
import { JwtPayload } from '@infrastructure/auth/jwt';

/**
 * Interfaz para la respuesta de cambio de estado del ticket
 */
type WisproChangeTicketStateApiResponse = {
  id: string;
  state: string;
  [key: string]: any;
};

@Injectable()
export class CloseOrderUseCase {
  private readonly logger = new Logger(CloseOrderUseCase.name);

  // Valores quemados según lo especificado
  private readonly COMMENT = 'Orden cerrada y firmada por el usuario';
  private readonly STATE = 'closed';
  private readonly LOCALE = 'es';

  constructor(private readonly wisproApiClient: WisproApiClientService) {}

  /**
   * Ejecuta el caso de uso para cerrar una orden
   * Primero obtiene la orden para extraer el ticketable_id, luego cierra el ticket
   * @param orderId - ID de la orden
   * @param jwtPayload - Payload del JWT token con las credenciales de Wispro
   * @returns Respuesta de la API de Wispro con el nuevo estado del ticket
   */
  async execute(
    orderId: string,
    jwtPayload: JwtPayload,
  ): Promise<WisproChangeTicketStateApiResponse> {
    this.logger.log(
      `Cerrando orden ${orderId} para usuario: ${jwtPayload.sub}`,
    );

    // Primero obtener la orden para extraer el ticketable_id
    const orderUrl = `/order/orders/${orderId}`;
    
    this.logger.debug(`Obteniendo orden ${orderId} para extraer ticketable_id`);

    const orderResponse: any = await this.wisproApiClient.get<any>(orderUrl, {
      csrfToken: jwtPayload.csrfToken,
      sessionCookie: jwtPayload.sessionCookie,
      customReferer: 'https://cloud.wispro.co/order/orders?locale=es',
    });

    // Extraer el ticketable_id de la respuesta
    // La orden puede venir en diferentes formatos: array de arrays o objeto
    let order: any = null;
    
    if (Array.isArray(orderResponse) && orderResponse.length > 0) {
      // Si es array de arrays, tomar el primer elemento
      order = Array.isArray(orderResponse[0]) ? orderResponse[0][0] : orderResponse[0];
    } else if (orderResponse && typeof orderResponse === 'object') {
      order = orderResponse;
    }

    if (!order) {
      this.logger.error(`No se pudo obtener la orden ${orderId}`);
      throw new NotFoundException(`Orden ${orderId} no encontrada`);
    }

    const ticketableId = order.ticketable_id || order.ticket?.id;

    if (!ticketableId) {
      this.logger.error(`No se encontró ticketable_id en la orden ${orderId}`);
      throw new NotFoundException(
        `No se pudo encontrar el ticket asociado a la orden ${orderId}`,
      );
    }

    this.logger.debug(`Ticket ID encontrado: ${ticketableId} para la orden ${orderId}`);

    // Construir la URL para cerrar el ticket
    const changeStateUrl = `/help_desk/issues/${ticketableId}/change_state?react=true`;

    // Preparar el body según lo que espera Wispro
    const requestBody = {
      help_desk_issue: {
        state: this.STATE,
        help_desk_issue_comment: this.COMMENT,
      },
      locale: this.LOCALE,
    };

    this.logger.debug(
      `Enviando petición de cierre de ticket a: ${changeStateUrl}`,
    );
    this.logger.debug(`Body: ${JSON.stringify(requestBody)}`);

    // Realizar petición autenticada a la API de Wispro
    const apiResponse: WisproChangeTicketStateApiResponse =
      await this.wisproApiClient.patch<WisproChangeTicketStateApiResponse>(
        changeStateUrl,
        requestBody,
        {
          csrfToken: jwtPayload.csrfToken,
          sessionCookie: jwtPayload.sessionCookie,
          customReferer: `https://cloud.wispro.co/help_desk/issues/${ticketableId}?locale=es`,
        },
      );

    this.logger.log(
      `Orden ${orderId} cerrada exitosamente. Nuevo estado del ticket: ${apiResponse.state}`,
    );

    return apiResponse;
  }
}


