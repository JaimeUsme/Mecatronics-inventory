/**
 * Users Controller
 * 
 * Controlador que maneja los endpoints relacionados con usuarios.
 * Expone endpoints REST para operaciones de usuarios.
 */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { GetCurrentUserUseCase } from '@application/use-cases';
import { GetCurrentUserResponseDto } from '@presentation/dto';
import { JwtAuthGuard } from '@presentation/guards';
import { CurrentUser } from '@presentation/decorators';
import { JwtPayload } from '@infrastructure/auth/jwt';

@Controller('users')
export class UsersController {
  constructor(private readonly getCurrentUserUseCase: GetCurrentUserUseCase) {}

  /**
   * Endpoint para obtener el usuario actual
   * 
   * Obtiene la información del usuario actual desde la API de Wispro
   * usando las credenciales de autenticación del JWT token.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Información del usuario (id, name, email, phone_mobile)
   * 
   * @example
   * GET /users/current
   * Authorization: Bearer <jwt-token>
   */
  @Get('current')
  @UseGuards(JwtAuthGuard)
  async getCurrentUser(@CurrentUser() user: JwtPayload): Promise<GetCurrentUserResponseDto> {
    return this.getCurrentUserUseCase.execute(user);
  }
}

