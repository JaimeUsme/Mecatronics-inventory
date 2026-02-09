/**
 * Employees Controller
 * 
 * Controlador que maneja los endpoints relacionados con empleados.
 * Expone endpoints REST para operaciones de empleados.
 */
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GetEmployeesUseCase } from '@application/use-cases';
import {
  GetEmployeesRequestDto,
  GetEmployeesResponseDto,
} from '@presentation/dto';
import { JwtAuthGuard } from '@presentation/guards';
import { CurrentUser } from '@presentation/decorators';
import { JwtPayload } from '@infrastructure/auth/jwt';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly getEmployeesUseCase: GetEmployeesUseCase) {}

  /**
   * Endpoint para obtener la lista de empleados
   * 
   * Obtiene la lista de empleados desde la API de Wispro
   * usando las credenciales de autenticación del JWT token.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param query - Query parameters (per_page, page, react, search)
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Lista de empleados desde la API de Wispro
   * 
   * @example
   * GET /employees?per_page=20&page=1&react=true
   * GET /employees?per_page=20&page=1&react=true&search=RUBY
   * Authorization: Bearer <jwt-token>
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getEmployees(
    @Query() query: GetEmployeesRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<GetEmployeesResponseDto> {
    return this.getEmployeesUseCase.execute(query, user);
  }
}

