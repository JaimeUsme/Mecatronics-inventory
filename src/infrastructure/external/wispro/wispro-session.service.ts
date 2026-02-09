/**
 * Wispro Session Service
 * 
 * Servicio que gestiona la sesión de autenticación con Wispro.
 * Almacena las credenciales (cookie y CSRF token) en memoria para
 * que puedan ser reutilizadas en todas las peticiones a la API de Wispro.
 * 
 * Este servicio actúa como un almacén de sesión en memoria.
 * En producción, podría extenderse para usar Redis o una base de datos.
 */
import { Injectable, Logger } from '@nestjs/common';

interface WisproSession {
  csrfToken: string;
  sessionCookie: string;
  expiresAt?: number;
}

@Injectable()
export class WisproSessionService {
  private readonly logger = new Logger(WisproSessionService.name);
  private session: WisproSession | null = null;

  /**
   * Guarda las credenciales de sesión de Wispro
   * @param csrfToken - Token CSRF
   * @param sessionCookie - Cookie de sesión _wispro_session_v2
   * @param expiresIn - Tiempo de expiración en segundos (opcional)
   */
  setSession(
    csrfToken: string,
    sessionCookie: string,
    expiresIn?: number,
  ): void {
    this.logger.log('Guardando sesión de Wispro');
    this.session = {
      csrfToken,
      sessionCookie,
      expiresAt: expiresIn
        ? Date.now() + expiresIn * 1000
        : undefined,
    };
  }

  /**
   * Obtiene las credenciales de sesión actuales
   * @returns Credenciales de sesión o null si no hay sesión activa
   */
  getSession(): WisproSession | null {
    if (!this.session) {
      return null;
    }

    // Verificar si la sesión ha expirado
    if (this.session.expiresAt && Date.now() > this.session.expiresAt) {
      this.logger.warn('La sesión de Wispro ha expirado');
      this.clearSession();
      return null;
    }

    return this.session;
  }

  /**
   * Obtiene el token CSRF de la sesión actual
   * @returns Token CSRF o null si no hay sesión
   */
  getCsrfToken(): string | null {
    const session = this.getSession();
    return session?.csrfToken || null;
  }

  /**
   * Obtiene la cookie de sesión actual
   * @returns Cookie de sesión o null si no hay sesión
   */
  getSessionCookie(): string | null {
    const session = this.getSession();
    return session?.sessionCookie || null;
  }

  /**
   * Verifica si hay una sesión activa
   * @returns true si hay sesión activa, false en caso contrario
   */
  hasActiveSession(): boolean {
    return this.getSession() !== null;
  }

  /**
   * Limpia la sesión actual
   */
  clearSession(): void {
    this.logger.log('Limpiando sesión de Wispro');
    this.session = null;
  }

  /**
   * Obtiene las credenciales en formato para el cliente HTTP
   * @returns Objeto con csrfToken y sessionCookie, o null si no hay sesión
   */
  getCredentials(): { csrfToken: string; sessionCookie: string } | null {
    const session = this.getSession();
    if (!session) {
      return null;
    }

    return {
      csrfToken: session.csrfToken,
      sessionCookie: session.sessionCookie,
    };
  }
}

