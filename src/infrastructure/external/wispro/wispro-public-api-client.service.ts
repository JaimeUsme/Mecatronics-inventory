/**
 * Wispro Public API Client Service
 *
 * Servicio que actúa como cliente HTTP para interactuar con la API pública de Wispro.
 * Maneja peticiones a endpoints públicos que requieren autenticación por token (sin Bearer).
 *
 * Este servicio pertenece a la capa de infraestructura y actúa como un adaptador
 * para comunicarse con servicios externos públicos de Wispro.
 */
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WisproPublicApiClientService {
  private readonly logger = new Logger(WisproPublicApiClientService.name);
  private readonly baseUrl = 'https://cloud.wispro.co';
  private readonly apiToken: string;

  constructor(private configService: ConfigService) {
    this.apiToken = this.configService.get<string>(
      'WISPRO_PUBLIC_API_TOKEN',
      '',
    );

    if (!this.apiToken) {
      this.logger.warn(
        'WISPRO_PUBLIC_API_TOKEN not set in environment variables',
      );
    }
  }

  /**
   * Obtiene los planes disponibles desde la API pública de Wispro
   * @param queryParams - Parámetros de query opcionales (page, per_page)
   * @returns Respuesta con planes y paginación
   */
  async getPlans(
    queryParams?: {
      page?: number;
      per_page?: number;
    },
  ): Promise<any> {
    try {
      const url = new URL(`${this.baseUrl}/api/v1/plans`);

      // Agregar parámetros de query si se proporcionan
      if (queryParams?.page !== undefined) {
        url.searchParams.append('page', queryParams.page.toString());
      }
      if (queryParams?.per_page !== undefined) {
        url.searchParams.append('per_page', queryParams.per_page.toString());
      }

      const headers = this.getHeaders();

      this.logger.debug(`Making GET request to: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Public API request failed: ${response.status} ${response.statusText}`,
        );
        this.logger.error(`Error details: ${errorText}`);

        if (response.status === 401) {
          throw new HttpException(
            'Wispro Public API token inválido o expirado',
            HttpStatus.UNAUTHORIZED,
          );
        }

        throw new HttpException(
          `Public API request failed: ${response.statusText}`,
          response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      this.logger.debug(`Public API request successful to: ${url.toString()}`);

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error making public API request:`, error);
      throw new HttpException(
        'Failed to communicate with Wispro Public API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene los headers necesarios para las peticiones a la API pública de Wispro
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': this.apiToken,
    };
  }
}
