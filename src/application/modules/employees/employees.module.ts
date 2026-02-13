/**
 * Employees Module
 * 
 * Módulo que agrupa todos los componentes relacionados con empleados:
 * - Casos de uso de empleados
 * - Controladores de empleados
 * - Cliente HTTP de Wispro API
 */
import { Module } from '@nestjs/common';
import { WisproApiModule } from '@infrastructure/external';
import { GetEmployeesUseCase } from '@application/use-cases';
import { EmployeesController } from '@presentation/controllers';

@Module({
  imports: [WisproApiModule],
  controllers: [EmployeesController],
  providers: [GetEmployeesUseCase],
  exports: [GetEmployeesUseCase],
})
export class EmployeesModule {}


