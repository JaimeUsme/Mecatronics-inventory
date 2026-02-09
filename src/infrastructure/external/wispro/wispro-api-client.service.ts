/**
 * Wispro API Client Service
 * 
 * Servicio que actúa como cliente HTTP para interactuar con la API de Wispro.
 * Maneja las peticiones autenticadas usando cookies y CSRF tokens.
 * 
 * Este servicio pertenece a la capa de infraestructura y actúa como un adaptador
 * para comunicarse con servicios externos.
 */
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

interface WisproApiRequestOptions {
  csrfToken?: string;
  sessionCookie?: string;
  queryParams?: Record<string, any>;
  customReferer?: string;
}

interface WisproApiResponse<T = any> {
  data: T;
}

@Injectable()
export class WisproApiClientService {
  private readonly logger = new Logger(WisproApiClientService.name);
  private readonly baseUrl = 'https://cloud.wispro.co';

  /**
   * Realiza una petición GET autenticada a la API de Wispro
   * @param endpoint - Endpoint relativo (ej: '/users/current')
   * @param options - Opciones de autenticación y query params (opcionales, se usan de la sesión si no se proporcionan)
   * @returns Respuesta de la API
   */
  async get<T = any>(
    endpoint: string,
    options?: WisproApiRequestOptions,
  ): Promise<T> {
    try {
      // Obtener credenciales de las opciones (deben venir del JWT)
      const credentials = this.getCredentials(options);

      if (!credentials) {
        throw new HttpException(
          'Credenciales de Wispro no proporcionadas. El token JWT debe contener las credenciales.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Construir URL con query params si existen
      let url = `${this.baseUrl}${endpoint}`;
      if (options?.queryParams) {
        const queryString = new URLSearchParams(
          Object.entries(options.queryParams)
            .filter(([_, value]) => value !== undefined && value !== null)
            .reduce((acc, [key, value]) => {
              acc[key] = String(value);
              return acc;
            }, {} as Record<string, string>),
        ).toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      // Determinar Referer (usar custom si se proporciona, sino usar el endpoint)
      const referer = options?.customReferer || `${this.baseUrl}${endpoint}?locale=es`;

      // Usar la cookie directamente del JWT (ya viene URL-encoded, no necesita decodificación)
      const cookieHeaderValue = credentials.sessionCookie;
      
      // Construir el header Cookie completo
      const cookieHeader = `_wispro_session_v2=${cookieHeaderValue}`;
      
      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json;charset=utf-8',
        'Cookie': cookieHeader,
        'X-CSRF-Token': credentials.csrfToken,
        'Referer': referer,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Cache-Control': 'no-cache',
      };
      
      this.logger.debug(`Making GET request to: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`API request failed: ${response.status} ${response.statusText}`);
        this.logger.error(`URL: ${url}`);
        this.logger.error(`Error details: ${errorText.substring(0, 500)}`);
        throw new HttpException(
          `API request failed: ${response.statusText}. Verifica que las credenciales en el JWT sean válidas y no hayan expirado.`,
          response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data: T = await response.json();
      this.logger.debug(`API request successful to: ${endpoint}`);
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error making API request to ${endpoint}:`, error);
      throw new HttpException(
        'Failed to communicate with Wispro API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Realiza una petición POST autenticada a la API de Wispro
   * @param endpoint - Endpoint relativo
   * @param body - Cuerpo de la petición
   * @param options - Opciones de autenticación (opcionales, se usan de la sesión si no se proporcionan)
   * @returns Respuesta de la API
   */
  async post<T = any>(
    endpoint: string,
    body: any,
    options?: WisproApiRequestOptions,
  ): Promise<T> {
    try {
      // Obtener credenciales de las opciones (deben venir del JWT)
      const credentials = this.getCredentials(options);

      if (!credentials) {
        throw new HttpException(
          'Credenciales de Wispro no proporcionadas. El token JWT debe contener las credenciales.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const url = `${this.baseUrl}${endpoint}`;
      this.logger.debug(`Making POST request to: ${url}`);

      // Usar la cookie directamente del JWT (ya viene URL-encoded, no necesita decodificación)
      const cookieHeaderValue = credentials.sessionCookie;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Cookie': `_wispro_session_v2=${cookieHeaderValue}`,
          'X-CSRF-Token': credentials.csrfToken,
          'Referer': `${this.baseUrl}/`,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': 'application/json;charset=utf-8',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `API request failed: ${response.status} ${response.statusText}`,
        );
        this.logger.error(`Error details: ${errorText}`);
        throw new HttpException(
          `API request failed: ${response.statusText}`,
          response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data: T = await response.json();
      this.logger.debug(`API request successful to: ${endpoint}`);
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error making API request to ${endpoint}:`, error);
      throw new HttpException(
        'Failed to communicate with Wispro API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Realiza una petición POST con multipart/form-data (para subir archivos)
   * @param endpoint - Endpoint relativo
   * @param file - Archivo a subir (Express.Multer.File)
   * @param options - Opciones de autenticación
   * @returns Respuesta de la API
   */
  async postMultipart<T = any>(
    endpoint: string,
    file: Express.Multer.File,
    options?: WisproApiRequestOptions,
  ): Promise<T> {
    try {
      // Obtener credenciales de las opciones (deben venir del JWT)
      const credentials = this.getCredentials(options);

      if (!credentials) {
        throw new HttpException(
          'Credenciales de Wispro no proporcionadas. El token JWT debe contener las credenciales.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const url = `${this.baseUrl}${endpoint}`;
      const referer = options?.customReferer || `${this.baseUrl}${endpoint}?locale=es`;

      // Usar la cookie directamente del JWT (ya viene URL-encoded, no necesita decodificación)
      const cookieHeaderValue = credentials.sessionCookie;

      // Crear FormData para multipart/form-data usando el paquete form-data
      // Usar require para evitar problemas con la importación de form-data
      const FormData = require('form-data');
      const formData = new FormData();
      // Wispro espera el campo como 'file[]' (array)
      formData.append('file[]', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype || 'application/octet-stream',
      });

      this.logger.debug(`Making POST multipart request to: ${url}`);

      // Usar axios para multipart/form-data ya que maneja mejor los streams
      const response = await axios.post<T>(url, formData, {
        headers: {
          ...formData.getHeaders(),
          'Accept': 'application/json',
          'Cookie': `_wispro_session_v2=${cookieHeaderValue}`,
          'X-CSRF-Token': credentials.csrfToken,
          'Referer': referer,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9',
          'Cache-Control': 'no-cache',
        },
        validateStatus: (status) => status === 200 || status === 201, // Aceptar 200 y 201
      });

      this.logger.debug(`API request successful to: ${endpoint}, status: ${response.status}`);
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error making API request to ${endpoint}:`, error);
      throw new HttpException(
        'Failed to communicate with Wispro API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Realiza una petición DELETE autenticada a la API de Wispro
   * @param endpoint - Endpoint relativo
   * @param options - Opciones de autenticación
   * @returns Respuesta de la API (puede ser vacía)
   */
  async delete<T = any>(
    endpoint: string,
    options?: WisproApiRequestOptions,
  ): Promise<T> {
    try {
      // Obtener credenciales de las opciones (deben venir del JWT)
      const credentials = this.getCredentials(options);

      if (!credentials) {
        throw new HttpException(
          'Credenciales de Wispro no proporcionadas. El token JWT debe contener las credenciales.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const url = `${this.baseUrl}${endpoint}`;
      const referer = options?.customReferer || `${this.baseUrl}${endpoint}?locale=es`;

      // Usar la cookie directamente del JWT (ya viene URL-encoded, no necesita decodificación)
      const cookieHeaderValue = credentials.sessionCookie;

      this.logger.debug(`Making DELETE request to: ${url}`);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json;charset=utf-8',
          'Cookie': `_wispro_session_v2=${cookieHeaderValue}`,
          'X-CSRF-Token': credentials.csrfToken,
          'Referer': referer,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9',
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `API request failed: ${response.status} ${response.statusText}`,
        );
        this.logger.error(`Error details: ${errorText}`);
        throw new HttpException(
          `API request failed: ${response.statusText}`,
          response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Intentar parsear la respuesta como JSON, pero puede estar vacía
      const responseText = await response.text();
      let data: T;

      if (!responseText || responseText.trim() === '' || responseText === '{}') {
        // Respuesta vacía, devolver objeto vacío
        data = {} as T;
      } else {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          // Si no es JSON válido, devolver objeto vacío
          this.logger.debug(`Response is not valid JSON, returning empty object`);
          data = {} as T;
        }
      }

      this.logger.debug(`API request successful to: ${endpoint}`);
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error making API request to ${endpoint}:`, error);
      throw new HttpException(
        'Failed to communicate with Wispro API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene las credenciales de autenticación.
   * Prioriza las opciones proporcionadas explícitamente.
   * @param options - Opciones opcionales de autenticación
   * @returns Credenciales de autenticación o null
   */
  private getCredentials(
    options?: WisproApiRequestOptions,
  ): { csrfToken: string; sessionCookie: string } | null {
    // Si se proporcionan opciones explícitas, usarlas
    if (options?.csrfToken && options?.sessionCookie) {
      return {
        csrfToken: options.csrfToken,
        sessionCookie: options.sessionCookie,
      };
    }

    // Si no se proporcionan, lanzar error (las credenciales deben venir del JWT)
    return null;
  }
}

