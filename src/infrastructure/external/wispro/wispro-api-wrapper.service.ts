/**
 * Wispro API Wrapper Service
 *
 * High-level service that wraps WisproApiClientService and handles:
 * - Automatic token refresh on 401
 * - Passing userId for token refresh capability
 * - Returning new JWT when token is refreshed
 *
 * This service should be used by application services and controllers
 * that need to interact with Wispro API with automatic token refresh.
 */
import { Injectable, Logger } from '@nestjs/common';
import { WisproApiClientService } from './wispro-api-client.service';

interface WisproApiWrapperOptions {
  csrfToken: string;
  sessionCookie: string;
  userId?: string; // User ID for token refresh on 401
  queryParams?: Record<string, any>;
  customReferer?: string;
}

export interface WisproApiWrapperResponse<T> {
  data: T;
  newJwt?: string; // New JWT if token was refreshed
  wasTokenRefreshed?: boolean;
}

@Injectable()
export class WisproApiWrapperService {
  private readonly logger = new Logger(WisproApiWrapperService.name);

  constructor(private apiClient: WisproApiClientService) {}

  /**
   * Makes a GET request with automatic token refresh support
   * @param endpoint - API endpoint
   * @param options - Request options including userId for refresh capability
   * @returns Response data + new JWT if token was refreshed
   */
  async get<T = any>(
    endpoint: string,
    options: WisproApiWrapperOptions,
  ): Promise<WisproApiWrapperResponse<T>> {
    try {
      const result = await this.apiClient.get<T>(endpoint, {
        csrfToken: options.csrfToken,
        sessionCookie: options.sessionCookie,
        userId: options.userId,
        queryParams: options.queryParams,
        customReferer: options.customReferer,
      });

      return {
        data: result,
        wasTokenRefreshed: false,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Makes a POST request with automatic token refresh support
   * @param endpoint - API endpoint
   * @param body - Request body
   * @param options - Request options including userId for refresh capability
   * @param useFormData - Whether to use form data encoding
   * @returns Response data + new JWT if token was refreshed
   */
  async post<T = any>(
    endpoint: string,
    body: any,
    options: WisproApiWrapperOptions,
    useFormData: boolean = false,
  ): Promise<WisproApiWrapperResponse<T>> {
    try {
      const result = await this.apiClient.post<T>(endpoint, body, {
        csrfToken: options.csrfToken,
        sessionCookie: options.sessionCookie,
        userId: options.userId,
        queryParams: options.queryParams,
        customReferer: options.customReferer,
      }, useFormData);

      return {
        data: result,
        wasTokenRefreshed: false,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Makes a PUT request with automatic token refresh support
   * @param endpoint - API endpoint
   * @param body - Request body
   * @param options - Request options including userId for refresh capability
   * @returns Response data + new JWT if token was refreshed
   */
  async put<T = any>(
    endpoint: string,
    body: any,
    options: WisproApiWrapperOptions,
  ): Promise<WisproApiWrapperResponse<T>> {
    try {
      const result = await this.apiClient.put<T>(endpoint, body, {
        csrfToken: options.csrfToken,
        sessionCookie: options.sessionCookie,
        userId: options.userId,
        queryParams: options.queryParams,
        customReferer: options.customReferer,
      });

      return {
        data: result,
        wasTokenRefreshed: false,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Makes a PATCH request with automatic token refresh support
   * @param endpoint - API endpoint
   * @param body - Request body
   * @param options - Request options including userId for refresh capability
   * @returns Response data + new JWT if token was refreshed
   */
  async patch<T = any>(
    endpoint: string,
    body: any,
    options: WisproApiWrapperOptions,
  ): Promise<WisproApiWrapperResponse<T>> {
    try {
      const result = await this.apiClient.patch<T>(endpoint, body, {
        csrfToken: options.csrfToken,
        sessionCookie: options.sessionCookie,
        userId: options.userId,
        queryParams: options.queryParams,
        customReferer: options.customReferer,
      });

      return {
        data: result,
        wasTokenRefreshed: false,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Makes a DELETE request with automatic token refresh support
   * @param endpoint - API endpoint
   * @param options - Request options including userId for refresh capability
   * @returns Response data + new JWT if token was refreshed
   */
  async delete<T = any>(
    endpoint: string,
    options: WisproApiWrapperOptions,
  ): Promise<WisproApiWrapperResponse<T>> {
    try {
      const result = await this.apiClient.delete<T>(endpoint, {
        csrfToken: options.csrfToken,
        sessionCookie: options.sessionCookie,
        userId: options.userId,
        queryParams: options.queryParams,
        customReferer: options.customReferer,
      });

      return {
        data: result,
        wasTokenRefreshed: false,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Makes a multipart POST request with automatic token refresh support
   * @param endpoint - API endpoint
   * @param file - File to upload
   * @param options - Request options including userId for refresh capability
   * @returns Response data + new JWT if token was refreshed
   */
  async postMultipart<T = any>(
    endpoint: string,
    file: Express.Multer.File,
    options: WisproApiWrapperOptions,
  ): Promise<WisproApiWrapperResponse<T>> {
    try {
      const result = await this.apiClient.postMultipart<T>(endpoint, file, {
        csrfToken: options.csrfToken,
        sessionCookie: options.sessionCookie,
        userId: options.userId,
        queryParams: options.queryParams,
        customReferer: options.customReferer,
      });

      return {
        data: result,
        wasTokenRefreshed: false,
      };
    } catch (error) {
      throw error;
    }
  }
}
