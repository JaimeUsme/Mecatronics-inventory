/**
 * Crews Module
 * 
 * Módulo de aplicación que agrupa servicios y controladores
 * relacionados con cuadrillas.
 */
import { Module } from '@nestjs/common';
import { CrewsModule as CrewsServiceModule } from '@application/services/crews';
import { CrewsController } from '@presentation/controllers/crews/crews.controller';

@Module({
  imports: [CrewsServiceModule],
  controllers: [CrewsController],
  exports: [CrewsServiceModule],
})
export class CrewsModule {}


