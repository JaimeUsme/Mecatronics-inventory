/**
 * Users Module
 * 
 * Módulo que agrupa todos los componentes relacionados con usuarios:
 * - Casos de uso de usuarios
 * - Controladores de usuarios
 * - Cliente HTTP de Wispro API
 */
import { Module } from '@nestjs/common';
import { WisproApiModule } from '@infrastructure/external';
import { GetCurrentUserUseCase } from '@application/use-cases';
import { UsersController } from '@presentation/controllers';

@Module({
  imports: [WisproApiModule],
  controllers: [UsersController],
  providers: [GetCurrentUserUseCase],
  exports: [GetCurrentUserUseCase],
})
export class UsersModule {}

