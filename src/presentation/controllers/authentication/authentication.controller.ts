/**
 * Authentication Controller
 * 
 * Controlador que maneja los endpoints relacionados con autenticación.
 * Expone endpoints REST para operaciones de login y gestión de sesiones.
 */
import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { LoginUseCase, GetProfileUseCase } from '@application/use-cases';
import { LoginRequestDto, LoginResponseDto, ProfileResponseDto } from '@presentation/dto';
import { JwtPermissiveGuard } from '@presentation/guards/jwt-permissive.guard';
import { CurrentUser } from '@presentation/decorators';
import { JwtPayload } from '@infrastructure/auth/jwt';

@Controller('auth')
export class AuthenticationController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly getProfileUseCase: GetProfileUseCase,
  ) {}

  /**
   * Endpoint de login
   * 
   * Realiza el login en Wispro mediante automatización con Playwright
   * y retorna las cookies de sesión y el token CSRF.
   * 
   * @param loginDto - Credenciales de login (email y password)
   * @returns Resultado con cookies y CSRF token
   * 
   * @example
   * POST /auth/login
   * {
   *   "email": "usuario@example.com",
   *   "password": "miPassword123"
   * }
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginRequestDto): Promise<LoginResponseDto> {
    return this.loginUseCase.execute(loginDto);
  }

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

