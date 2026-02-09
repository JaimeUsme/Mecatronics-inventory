/**
 * Authentication Module
 * 
 * Módulo que agrupa todos los componentes relacionados con autenticación:
 * - Casos de uso de autenticación
 * - Controladores de autenticación
 * - Servicios de automatización necesarios
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WisproAutomationModule } from '@infrastructure/automation';
import { JwtAuthModule } from '@infrastructure/auth/jwt';
import { InternalUser } from '@infrastructure/persistence/entities';
import { LoginUseCase, GetProfileUseCase } from '@application/use-cases';
import { AuthenticationController } from '@presentation/controllers';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    WisproAutomationModule,
    JwtAuthModule,
    TypeOrmModule.forFeature([InternalUser]),
    UsersModule,
  ],
  controllers: [AuthenticationController],
  providers: [LoginUseCase, GetProfileUseCase],
  exports: [LoginUseCase, GetProfileUseCase],
})
export class AuthenticationModule {}

