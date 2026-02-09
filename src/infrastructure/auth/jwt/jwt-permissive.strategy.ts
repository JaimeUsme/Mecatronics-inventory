/**
 * JWT Permissive Strategy
 * 
 * Estrategia de Passport para validar JWT tokens de forma permisiva.
 * No requiere credenciales de Wispro, solo valida que el token sea válido.
 * Útil para endpoints como /auth/profile que necesitan funcionar incluso
 * sin credenciales de Wispro.
 */
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConfig } from '../../../config/jwt.config';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class JwtPermissiveStrategy extends PassportStrategy(Strategy, 'jwt-permissive') {
  private readonly logger = new Logger(JwtPermissiveStrategy.name);

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret,
    });
  }

  /**
   * Valida el payload del JWT token de forma permisiva
   * No requiere credenciales de Wispro, solo valida que el token sea válido
   * @param payload - Payload del JWT token
   * @returns Payload validado (puede no tener credenciales de Wispro)
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Normalizar payload si tiene credenciales de Wispro en wispro
    if (
      payload.type === 'internal' &&
      payload.wispro &&
      payload.wispro.linked &&
      payload.wispro.csrfToken &&
      payload.wispro.sessionCookie
    ) {
      this.logger.debug(
        `JWT permisivo: token interno con sesión Wispro para usuario: ${payload.sub}`,
      );
      return {
        ...payload,
        csrfToken: payload.wispro.csrfToken,
        sessionCookie: payload.wispro.sessionCookie,
      };
    }

    // Si es token de Wispro directo, devolverlo tal cual
    if (payload.csrfToken && payload.sessionCookie) {
      this.logger.debug(`JWT permisivo: token Wispro directo para: ${payload.sub}`);
      return payload;
    }

    // Token interno sin credenciales de Wispro - también válido para el perfil
    this.logger.debug(`JWT permisivo: token interno sin Wispro para usuario: ${payload.sub}`);
    return payload;
  }
}

