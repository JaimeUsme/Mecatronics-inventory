/**
 * Current User Decorator
 * 
 * Decorador para extraer el payload del JWT token del request.
 * Usa el payload que fue validado por el JwtStrategy.
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '@infrastructure/auth/jwt';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

