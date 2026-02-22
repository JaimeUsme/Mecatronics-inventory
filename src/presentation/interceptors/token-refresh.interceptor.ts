/**
 * Token Refresh Interceptor
 *
 * Global interceptor that checks if a JWT token was refreshed during request processing
 * and sets the response header with the new token.
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TokenRefreshContextService } from '@application/services/token-refresh-context.service';

@Injectable()
export class TokenRefreshInterceptor implements NestInterceptor {
  constructor(private moduleRef: ModuleRef) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    return next.handle().pipe(
      tap(() => {
        try {
          // Resolver el servicio REQUEST-scoped en el contexto actual
          const tokenRefreshContext =
            this.moduleRef.get(TokenRefreshContextService, { strict: false });
          if (tokenRefreshContext) {
            const newJwt = tokenRefreshContext.getNewJwt();
            if (newJwt) {
              const response = context.switchToHttp().getResponse();
              response.setHeader('X-New-Auth-Token', newJwt);
            }
          }
        } catch (error) {
          // Si no se puede resolver el servicio, simplemente no establecer el header
          // Esto puede ocurrir en ciertos contextos donde el servicio no está disponible
        }
      }),
    );
  }
}
