/**
 * JWT Strategy
 * 
 * Estrategia de Passport para validar JWT tokens.
 * Extrae y valida el token JWT de las peticiones.
 */
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConfig } from '../../../config/jwt.config';
import { JwtPayload } from './jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret,
    });
  }

  /**
   * Valida el payload del JWT token
   * Este método se ejecuta automáticamente después de validar el token
   * @param payload - Payload del JWT token
   * @returns Payload validado
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // Caso A: token de Wispro directo (/auth/login)
    if (payload.csrfToken && payload.sessionCookie) {
      this.logger.debug(`JWT Wispro válido para: ${payload.sub}`);
      return payload;
    }

    // Caso B: token interno de Mecatronics con sección wispro válida
    // Solo aceptar si loginSuccess es explícitamente true
    if (
      payload.type === 'internal' &&
      payload.wispro &&
      payload.wispro.linked &&
      payload.wispro.loginSuccess === true &&
      payload.wispro.csrfToken &&
      payload.wispro.sessionCookie
    ) {
      this.logger.debug(
        `JWT interno con sesión Wispro válido para usuario interno: ${payload.sub}`,
      );

      // Normalizar para que el resto del sistema siempre use
      // payload.csrfToken y payload.sessionCookie
      return {
        ...payload,
        csrfToken: payload.wispro.csrfToken,
        sessionCookie: payload.wispro.sessionCookie,
      };
    }

    // Si tiene credenciales pero loginSuccess no es true, rechazar
    if (
      payload.type === 'internal' &&
      payload.wispro &&
      payload.wispro.linked &&
      (payload.wispro.loginSuccess === false || payload.wispro.loginSuccess === undefined)
    ) {
      this.logger.warn(
        `Token interno con Wispro vinculado pero login fallido o no exitoso para usuario: ${payload.sub}`,
      );
      throw new UnauthorizedException(
        'Token inválido: las credenciales de Wispro no son válidas. Usa /internal-auth/reconnect-wispro para reconectar.',
      );
    }

    // Si llega aquí, no hay credenciales de Wispro válidas
    this.logger.error(
      'Token inválido para endpoints de Wispro: faltan credenciales de Wispro',
    );
    throw new UnauthorizedException('Token inválido: faltan credenciales de Wispro');
  }
}

