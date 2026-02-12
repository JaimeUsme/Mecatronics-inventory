/**
 * Authentication Controller
 * 
 * Controlador que maneja los endpoints relacionados con autenticación.
 * Expone el endpoint de perfil para obtener información del usuario autenticado.
 * 
 * Nota: El login se realiza a través de /internal-auth/login (login interno de Mecatronics).
 */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { GetProfileUseCase } from '@application/use-cases';
import { ProfileResponseDto } from '@presentation/dto';
import { JwtPermissiveGuard } from '@presentation/guards/jwt-permissive.guard';
import { CurrentUser } from '@presentation/decorators';
import { JwtPayload } from '@infrastructure/auth/jwt';

@Controller('auth')
export class AuthenticationController {
  constructor(
    private readonly getProfileUseCase: GetProfileUseCase,
  ) {}

  /**
   * Endpoint de perfil
   * 
   * Obtiene la información del usuario autenticado y el estado de conexión con Wispro.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Información del perfil del usuario y estado de conexión con Wispro
   * 
   * @example
   * GET /auth/profile
   * Authorization: Bearer <jwt-token>
   */
  @Get('profile')
  @UseGuards(JwtPermissiveGuard)
  async getProfile(@CurrentUser() user: JwtPayload): Promise<ProfileResponseDto> {
    return this.getProfileUseCase.execute(user);
  }
}

