/**
 * Wispro API Module
 * 
 * Módulo que proporciona el cliente HTTP y el servicio de sesión
 * para interactuar con la API de Wispro.
 */
import { Module } from '@nestjs/common';
import { WisproApiClientService } from './wispro-api-client.service';
import { WisproSessionService } from './wispro-session.service';

@Module({
  providers: [WisproApiClientService, WisproSessionService],
  exports: [WisproApiClientService, WisproSessionService],
})
export class WisproApiModule {}

