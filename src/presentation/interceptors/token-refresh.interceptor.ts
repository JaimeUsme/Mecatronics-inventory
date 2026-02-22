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
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TokenRefreshContextService } from '@application/services/token-refresh-context.service';

@Injectable()
export class TokenRefreshInterceptor implements NestInterceptor {
  constructor(private readonly tokenRefreshContext: TokenRefreshContextService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> {
    return next.handle().pipe(
      tap(() => {
        const newJwt = this.tokenRefreshContext.getNewJwt();
        if (newJwt) {
          const response = context.switchToHttp().getResponse();
          response.setHeader('X-New-Auth-Token', newJwt);
        }
      }),
    );
  }
}
