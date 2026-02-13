/**
 * JWT Auth Guard
 * 
 * Guard que protege los endpoints requiriendo un JWT token válido.
 * Extrae las credenciales del token para usarlas en las peticiones a Wispro.
 */
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }
}


