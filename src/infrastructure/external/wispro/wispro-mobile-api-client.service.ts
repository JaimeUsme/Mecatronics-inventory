/**
 * Wispro Mobile API Client Service
 * 
 * Servicio que actúa como cliente HTTP para interactuar con la API móvil de Wispro.
 * Maneja las peticiones a los endpoints específicos de la app móvil.
 * 
 * Este servicio pertenece a la capa de infraestructura y actúa como un adaptador
 * para comunicarse con servicios externos.
 */
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';

/**
 * Interfaz para la respuesta de login móvil de Wispro
 */
export interface WisproMobileLoginResponse {
  token: string;
  user: {
    name: string;
    email: string;
    roles: string[];
    phone: string;
    phone_mobile: string;
  };
  isp: {
    name: string;
    language: string;
    time_zone: string;
  };
}

/**
 * Interfaz para el request de login móvil
 */
export interface WisproMobileLoginRequest {
  user: {
    email: string;
    password: string;
  };
}

@Injectable()
export class WisproMobileApiClientService {
  private readonly logger = new Logger(WisproMobileApiClientService.name);
  private readonly baseUrl = 'https://cloud.wispro.co';

  /**
   * Obtiene los headers móviles desde variables de entorno
   */
  private getMobileHeaders(): Record<string, string> {
    return {
      'User-Agent': process.env.WISPRO_MOBILE_USER_AGENT || 'Wispro/409 CFNetwork/3860.300.31 Darwin/25.2.0',
      'brand': process.env.WISPRO_MOBILE_BRAND || 'Apple',
      'model': process.env.WISPRO_MOBILE_MODEL || 'iPhone 15 Pro Max',
      'so_version': process.env.WISPRO_MOBILE_SO_VERSION || '26.2.1',
      'version': process.env.WISPRO_MOBILE_VERSION || '2.6.0 (409)',
      'wispro_mobile': process.env.WISPRO_MOBILE_TOKEN || '',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Obtiene los headers móviles con el token de autorización
   * @param authToken - Token de autorización de Wispro mobile
   */
  private getMobileHeadersWithAuth(authToken: string): Record<string, string> {
    const baseHeaders = this.getMobileHeaders();
    return {
      ...baseHeaders,
      'Authorization': authToken,
    };
  }

  /**
   * Realiza el login en la API móvil de Wispro
   * @param email - Email del usuario
   * @param password - Contraseña del usuario
   * @returns Respuesta de login con token y datos del usuario
   */
  async signIn(
    email: string,
    password: string,
  ): Promise<WisproMobileLoginResponse> {
    try {
      const url = `${this.baseUrl}/wispro_mobile/sign_in`;
      const headers = this.getMobileHeaders();
      
      const requestBody: WisproMobileLoginRequest = {
        user: {
          email,
          password,
        },
      };

      this.logger.debug(`Making POST request to: ${url}`);
      this.logger.debug(`Request body: ${JSON.stringify({ user: { email, password: '***' } })}`);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Mobile API request failed: ${response.status} ${response.statusText}`,
        );
        this.logger.error(`Error details: ${errorText}`);
        
        if (response.status === 401) {
          throw new HttpException(
            'Credenciales de Wispro móvil incorrectas',
            HttpStatus.UNAUTHORIZED,
          );
        }
        
        throw new HttpException(
          `Mobile API request failed: ${response.statusText}`,
          response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data: WisproMobileLoginResponse = await response.json();
      this.logger.debug(`Mobile API request successful to: ${url}`);
      this.logger.debug(`Response token: ${data.token?.substring(0, 20)}...`);
      
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error making mobile API request:`, error);
      throw new HttpException(
        'Failed to communicate with Wispro Mobile API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene las órdenes desde la API móvil de Wispro
   * @param authToken - Token de autorización de Wispro mobile
   * @param params - Parámetros de query (per_page, page, start_at_gteq, end_at_lteq)
   * @returns Respuesta con órdenes y paginación
   */
  async getOrders(
    authToken: string,
    params: {
      per_page?: number;
      page?: number;
      start_at_gteq?: string;
      end_at_lteq?: string;
    },
  ): Promise<any> {
    try {
      const url = new URL(`${this.baseUrl}/wispro_mobile/v1/orders`);
      
      // Agregar parámetros de query
      if (params.per_page !== undefined) {
        url.searchParams.append('per_page', params.per_page.toString());
      }
      if (params.page !== undefined) {
        url.searchParams.append('page', params.page.toString());
      }
      if (params.start_at_gteq) {
        url.searchParams.append('q[start_at_gteq]', params.start_at_gteq);
      }
      if (params.end_at_lteq) {
        url.searchParams.append('q[end_at_lteq]', params.end_at_lteq);
      }

      const headers = this.getMobileHeadersWithAuth(authToken);

      this.logger.debug(`Making GET request to: ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Mobile API request failed: ${response.status} ${response.statusText}`,
        );
        this.logger.error(`Error details: ${errorText}`);
        
        if (response.status === 401) {
          throw new HttpException(
            'Token de Wispro móvil inválido o expirado',
            HttpStatus.UNAUTHORIZED,
          );
        }
        
        throw new HttpException(
          `Mobile API request failed: ${response.statusText}`,
          response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      this.logger.debug(`Mobile API request successful to: ${url.toString()}`);
      
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error making mobile API request:`, error);
      throw new HttpException(
        'Failed to communicate with Wispro Mobile API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene los feedbacks de una orden desde la API móvil de Wispro
   * @param authToken - Token de autorización de Wispro mobile
   * @param orderId - ID de la orden
   * @returns Array de feedbacks
   */
  async getOrderFeedbacks(
    authToken: string,
    orderId: string,
  ): Promise<any> {
    try {
      const url = `${this.baseUrl}/wispro_mobile/v1/orders/${orderId}/feedbacks`;
      const headers = this.getMobileHeadersWithAuth(authToken);

      this.logger.debug(`Making GET request to: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Mobile API request failed: ${response.status} ${response.statusText}`,
        );
        this.logger.error(`Error details: ${errorText}`);
        
        if (response.status === 401) {
          throw new HttpException(
            'Token de Wispro móvil inválido o expirado',
            HttpStatus.UNAUTHORIZED,
          );
        }
        
        throw new HttpException(
          `Mobile API request failed: ${response.statusText}`,
          response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      this.logger.debug(`Mobile API request successful to: ${url}`);
      
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error making mobile API request:`, error);
      throw new HttpException(
        'Failed to communicate with Wispro Mobile API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Crea un feedback en una orden en la API móvil de Wispro
   * @param authToken - Token de autorización de Wispro mobile
   * @param orderId - ID de la orden
   * @param feedbackBody - Cuerpo del feedback
   * @param feedbackKindId - ID del tipo de feedback (opcional, para materiales)
   * @returns Objeto con el feedback creado
   */
  async createOrderFeedback(
    authToken: string,
    orderId: string,
    feedbackBody: string,
    feedbackKindId?: string,
  ): Promise<any> {
    try {
      const url = `${this.baseUrl}/wispro_mobile/v1/orders/${orderId}/feedbacks`;
      const headers = this.getMobileHeadersWithAuth(authToken);
      
      // Remover Content-Type de los headers base ya que lo estableceremos como application/json
      const { 'Content-Type': _, ...headersWithoutContentType } = headers;
      
      const requestHeaders = {
        ...headersWithoutContentType,
        'Content-Type': 'application/json',
      };

      const requestBody: any = {
        feedback: {
          body: feedbackBody,
        },
      };

      // Agregar feedback_kind_id si se proporciona (para materiales)
      if (feedbackKindId) {
        requestBody.feedback.feedback_kind_id = feedbackKindId;
      }

      this.logger.debug(`Making POST request to: ${url}`);
      this.logger.debug(`Request body: ${JSON.stringify(requestBody)}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Mobile API request failed: ${response.status} ${response.statusText}`,
        );
        this.logger.error(`Error details: ${errorText}`);
        
        if (response.status === 401) {
          throw new HttpException(
            'Token de Wispro móvil inválido o expirado',
            HttpStatus.UNAUTHORIZED,
          );
        }
        
        throw new HttpException(
          `Mobile API request failed: ${response.statusText}`,
          response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      this.logger.debug(`Mobile API request successful to: ${url}`);
      
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error making mobile API request:`, error);
      throw new HttpException(
        'Failed to communicate with Wispro Mobile API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Finaliza una orden en la API móvil de Wispro
   * @param authToken - Token de autorización de Wispro mobile
   * @param orderId - ID de la orden
   * @param body - Datos para finalizar la orden (feedback y order)
   * @returns Objeto con la orden finalizada
   */
  async finalizeOrder(
    authToken: string,
    orderId: string,
    body: {
      feedback?: { body: string };
      order: {
        initialized_at: string;
        finalized_at: string;
        result: string;
      };
    },
  ): Promise<any> {
    try {
      const url = `${this.baseUrl}/wispro_mobile/v1/orders/${orderId}/finalize`;
      const headers = this.getMobileHeadersWithAuth(authToken);
      
      // Remover Content-Type de los headers base ya que lo estableceremos como application/json
      const { 'Content-Type': _, ...headersWithoutContentType } = headers;
      
      const requestHeaders = {
        ...headersWithoutContentType,
        'Content-Type': 'application/json',
      };

      this.logger.debug(`Making PATCH request to: ${url}`);
      this.logger.debug(`Request body: ${JSON.stringify(body)}`);

      const response = await fetch(url, {
        method: 'PATCH',
        headers: requestHeaders,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Mobile API request failed: ${response.status} ${response.statusText}`,
        );
        this.logger.error(`Error details: ${errorText}`);
        
        if (response.status === 401) {
          throw new HttpException(
            'Token de Wispro móvil inválido o expirado',
            HttpStatus.UNAUTHORIZED,
          );
        }
        
        throw new HttpException(
          `Mobile API request failed: ${response.statusText}`,
          response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      this.logger.debug(`Mobile API request successful to: ${url}`);
      
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error making mobile API request:`, error);
      throw new HttpException(
        'Failed to communicate with Wispro Mobile API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Obtiene las imágenes de una orden desde la API móvil de Wispro
   * @param authToken - Token de autorización de Wispro mobile
   * @param orderId - ID de la orden
   * @returns Array de imágenes
   */
  async getOrderImages(
    authToken: string,
    orderId: string,
  ): Promise<any> {
    try {
      const url = `${this.baseUrl}/wispro_mobile/v1/orders/${orderId}/images`;
      const headers = this.getMobileHeadersWithAuth(authToken);

      this.logger.debug(`Making GET request to: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Mobile API request failed: ${response.status} ${response.statusText}`,
        );
        this.logger.error(`Error details: ${errorText}`);
        
        if (response.status === 401) {
          throw new HttpException(
            'Token de Wispro móvil inválido o expirado',
            HttpStatus.UNAUTHORIZED,
          );
        }
        
        throw new HttpException(
          `Mobile API request failed: ${response.statusText}`,
          response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      this.logger.debug(`Mobile API request successful to: ${url}`);
      
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error making mobile API request:`, error);
      throw new HttpException(
        'Failed to communicate with Wispro Mobile API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Reagenda una orden en la API móvil de Wispro
   * @param authToken - Token de autorización de Wispro mobile
   * @param orderId - ID de la orden
   * @param feedbackBody - Cuerpo del feedback explicando por qué se reagenda
   * @returns Objeto con la orden reagendada
   */
  async rescheduleOrder(
    authToken: string,
    orderId: string,
    feedbackBody: string,
  ): Promise<any> {
    try {
      const url = `${this.baseUrl}/wispro_mobile/v1/orders/${orderId}/reschedule`;
      const headers = this.getMobileHeadersWithAuth(authToken);
      
      // Remover Content-Type de los headers base ya que lo estableceremos como application/json
      const { 'Content-Type': _, ...headersWithoutContentType } = headers;
      
      const requestHeaders = {
        ...headersWithoutContentType,
        'Content-Type': 'application/json',
      };

      const requestBody = {
        feedback: {
          body: feedbackBody,
        },
      };

      this.logger.debug(`Making PATCH request to: ${url}`);
      this.logger.debug(`Request body: ${JSON.stringify(requestBody)}`);

      const response = await fetch(url, {
        method: 'PATCH',
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Mobile API request failed: ${response.status} ${response.statusText}`,
        );
        this.logger.error(`Error details: ${errorText}`);
        
        if (response.status === 401) {
          throw new HttpException(
            'Token de Wispro móvil inválido o expirado',
            HttpStatus.UNAUTHORIZED,
          );
        }
        
        throw new HttpException(
          `Mobile API request failed: ${response.statusText}`,
          response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const data = await response.json();
      this.logger.debug(`Mobile API request successful to: ${url}`);
      
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error making mobile API request:`, error);
      throw new HttpException(
        'Failed to communicate with Wispro Mobile API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Sube imágenes a una orden en la API móvil de Wispro
   * @param authToken - Token de autorización de Wispro mobile
   * @param orderId - ID de la orden
   * @param file - Archivo a subir (Express.Multer.File)
   * @returns Array de imágenes (incluyendo la nueva)
   */
  async uploadOrderImages(
    authToken: string,
    orderId: string,
    file: Express.Multer.File,
  ): Promise<any> {
    try {
      const url = `${this.baseUrl}/wispro_mobile/v1/orders/${orderId}/upload_images`;
      
      // Crear FormData para multipart/form-data
      // Usar form-data de Node.js
      const FormData = require('form-data');
      const formData = new FormData();
      // Wispro mobile espera el campo como 'images[]' (array)
      // Usar el buffer directamente - form-data lo manejará correctamente
      formData.append('images[]', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype || 'application/octet-stream',
      });

      // Obtener headers base sin Content-Type (el FormData lo proporcionará)
      const baseHeaders = this.getMobileHeadersWithAuth(authToken);
      // Remover Content-Type y Accept de baseHeaders para que FormData los establezca correctamente
      const { 'Content-Type': _, 'Accept': __, ...headersWithoutContentType } = baseHeaders;

      // Obtener headers del FormData (incluye Content-Type con boundary)
      const formDataHeaders = formData.getHeaders();
      
      // Construir headers finales: primero los del FormData, luego los móviles, luego los adicionales
      // NO incluir Accept - el servidor lo rechaza con 406
      const finalHeaders = {
        ...formDataHeaders, // Content-Type con boundary primero
        ...headersWithoutContentType, // Headers móviles sin Content-Type ni Accept
        'Upload-Complete': '?1',
        'Upload-Draft-Interop-Version': '6',
        'Accept-Language': 'es-419,es;q=0.9', // Según el ejemplo del usuario
      };

      this.logger.debug(`Making POST multipart request to: ${url}`);
      this.logger.debug(`File: ${file.originalname}, size: ${file.size} bytes, mimetype: ${file.mimetype}`);
      this.logger.debug(`Final headers keys: ${Object.keys(finalHeaders).join(', ')}`);
      // El Content-Type puede estar en minúsculas o mayúsculas
      const contentType = finalHeaders['Content-Type'] || finalHeaders['content-type'];
      this.logger.debug(`Content-Type: ${contentType}`);
      this.logger.debug(`Authorization: ${finalHeaders['Authorization']?.substring(0, 20)}...`);

      // Usar axios sin el header Accept (el servidor lo rechaza)
      const axios = require('axios');
      
      // Crear una instancia de axios con configuración personalizada
      // para evitar que agregue headers automáticamente
      const axiosInstance = axios.create({
        validateStatus: (status) => status === 200 || status === 201,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      
      // Interceptor para remover el Accept que axios agrega automáticamente
      axiosInstance.interceptors.request.use((config) => {
        if (config.headers) {
          // Remover Accept si existe
          delete config.headers['Accept'];
          delete config.headers['accept'];
        }
        return config;
      });
      
      this.logger.debug(`Request headers: ${JSON.stringify({
        'Content-Type': finalHeaders['Content-Type'] || finalHeaders['content-type'],
        'Authorization': finalHeaders['Authorization']?.substring(0, 20) + '...',
        'User-Agent': finalHeaders['User-Agent'],
        'brand': finalHeaders['brand'],
        'model': finalHeaders['model'],
      })}`);
      
      const response = await axiosInstance.post(url, formData, {
        headers: finalHeaders,
        transformRequest: [(data) => data], // No transformar el FormData
      });

      this.logger.debug(`Mobile API request successful to: ${url}, status: ${response.status}`);
      return response.data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error making mobile API request:`, error);
      
      if (error.response) {
        // Intentar obtener el body del error de diferentes formas
        let errorText = error.response.statusText;
        let errorData = error.response.data;
        
        // Si errorData es un objeto, intentar stringificarlo
        if (errorData) {
          if (typeof errorData === 'string') {
            errorText = errorData;
          } else if (typeof errorData === 'object') {
            try {
              errorText = JSON.stringify(errorData);
            } catch (e) {
              errorText = String(errorData);
            }
          }
        }
        
        // Intentar leer el body como texto si está disponible
        if (error.response.data && typeof error.response.data === 'object' && error.response.data.toString) {
          try {
            const textData = error.response.data.toString();
            if (textData) {
              this.logger.error(`Error body as text: ${textData}`);
            }
          } catch (e) {
            // Ignorar si no se puede convertir
          }
        }
        
        this.logger.error(`Error details: ${errorText}`);
        this.logger.error(`Error status: ${error.response.status}`);
        this.logger.error(`Error headers: ${JSON.stringify(error.response.headers)}`);
        this.logger.error(`Error config: ${JSON.stringify({
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers,
        })}`);
        
        if (error.response.status === 401) {
          throw new HttpException(
            'Token de Wispro móvil inválido o expirado',
            HttpStatus.UNAUTHORIZED,
          );
        }
        
        throw new HttpException(
          `Mobile API request failed: ${error.response.statusText} - ${errorText}`,
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      
      throw new HttpException(
        'Failed to communicate with Wispro Mobile API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Elimina una imagen de una orden en la API móvil de Wispro
   * @param authToken - Token de autorización de Wispro mobile
   * @param orderId - ID de la orden
   * @param imageId - ID de la imagen a eliminar
   * @returns Respuesta de la API (generalmente vacía o mínima)
   */
  async deleteOrderImage(
    authToken: string,
    orderId: string,
    imageId: string,
  ): Promise<any> {
    try {
      const url = `${this.baseUrl}/wispro_mobile/v1/orders/${orderId}/images/${imageId}`;
      const headers = this.getMobileHeadersWithAuth(authToken);

      this.logger.debug(`Making DELETE request to: ${url}`);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Mobile API request failed: ${response.status} ${response.statusText}`,
        );
        this.logger.error(`Error details: ${errorText}`);
        
        if (response.status === 401) {
          throw new HttpException(
            'Token de Wispro móvil inválido o expirado',
            HttpStatus.UNAUTHORIZED,
          );
        }
        
        throw new HttpException(
          `Mobile API request failed: ${response.statusText}`,
          response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Intentar parsear la respuesta como JSON, pero puede estar vacía
      const contentType = response.headers.get('content-type');
      let data: any;
      
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        if (text && text.trim()) {
          try {
            data = JSON.parse(text);
          } catch (e) {
            // Si no se puede parsear, devolver el texto
            data = text;
          }
        } else {
          // Respuesta vacía
          data = null;
        }
      } else {
        // Si no es JSON, leer como texto
        const text = await response.text();
        data = text || null;
      }

      this.logger.debug(`Mobile API request successful to: ${url}`);
      
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Error making mobile API request:`, error);
      throw new HttpException(
        'Failed to communicate with Wispro Mobile API',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}


