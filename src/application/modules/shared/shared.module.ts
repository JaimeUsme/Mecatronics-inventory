/**
 * Shared Module
 *
 * Módulo compartido que proporciona servicios y utilidades
 * disponibles en toda la aplicación.
 */
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TokenRefreshContextService } from '@application/services/token-refresh-context.service';
import { TokenRefreshInterceptor } from '@presentation/interceptors';

@Module({
  providers: [
    TokenRefreshContextService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TokenRefreshInterceptor,
    },
  ],
  exports: [TokenRefreshContextService],
})
export class SharedModule {}
