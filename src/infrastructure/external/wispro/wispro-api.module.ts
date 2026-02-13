/**
 * Wispro API Module
 * 
 * Módulo que proporciona el cliente HTTP y el servicio de sesión
 * para interactuar con la API de Wispro (web y móvil).
 */
import { Module } from '@nestjs/common';
import { WisproApiClientService } from './wispro-api-client.service';
import { WisproSessionService } from './wispro-session.service';
import { WisproMobileApiClientService } from './wispro-mobile-api-client.service';

@Module({
  providers: [
    WisproApiClientService,
    WisproSessionService,
    WisproMobileApiClientService,
  ],
  exports: [
    WisproApiClientService,
    WisproSessionService,
    WisproMobileApiClientService,
  ],
})
export class WisproApiModule {}

