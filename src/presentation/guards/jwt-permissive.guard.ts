/**
 * JWT Permissive Guard
 * 
 * Guard que protege los endpoints requiriendo un JWT token válido,
 * pero sin requerir credenciales de Wispro.
 * Útil para endpoints como /auth/profile que necesitan funcionar
 * incluso sin credenciales de Wispro.
 */
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtPermissiveGuard extends AuthGuard('jwt-permissive') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }
}

