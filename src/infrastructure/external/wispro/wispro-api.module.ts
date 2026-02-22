/**
 * Wispro API Module
 *
 * Módulo que proporciona el cliente HTTP y el servicio de sesión
 * para interactuar con la API de Wispro (web y móvil).
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { WisproApiClientService } from './wispro-api-client.service';
import { WisproApiWrapperService } from './wispro-api-wrapper.service';
import { WisproSessionService } from './wispro-session.service';
import { WisproSessionManagerService } from './wispro-session-manager.service';
import { WisproMobileApiClientService } from './wispro-mobile-api-client.service';
import { InternalUser } from '@infrastructure/persistence/entities';
import { WisproAutomationModule } from '@infrastructure/automation';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([InternalUser]),
    WisproAutomationModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [
    WisproApiClientService,
    WisproApiWrapperService,
    WisproSessionService,
    WisproSessionManagerService,
    WisproMobileApiClientService,
  ],
  exports: [
    WisproApiClientService,
    WisproApiWrapperService,
    WisproSessionService,
    WisproSessionManagerService,
    WisproMobileApiClientService,
  ],
})
export class WisproApiModule {}

