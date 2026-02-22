/**
 * Authentication Module
 *
 * Módulo que agrupa todos los componentes relacionados con autenticación:
 * - Casos de uso de autenticación (perfil)
 * - Controladores de autenticación
 *
 * Nota: El login se realiza a través de /internal-auth/login (login interno de Mecatronics).
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthModule } from '@infrastructure/auth/jwt';
import { InternalUser } from '@infrastructure/persistence/entities';
import { GetProfileUseCase } from '@application/use-cases';
import { AuthenticationController } from '@presentation/controllers';
import { WisproApiModule } from '@infrastructure/external';
import { SharedModule } from '@application/modules/shared/shared.module';

@Module({
  imports: [
    JwtAuthModule,
    TypeOrmModule.forFeature([InternalUser]),
    WisproApiModule,
    SharedModule,
  ],
  controllers: [AuthenticationController],
  providers: [GetProfileUseCase],
  exports: [GetProfileUseCase],
})
export class AuthenticationModule {}

