/**
 * Login Use Case
 * 
 * Caso de uso que orquesta el proceso de login en Wispro.
 * Utiliza el servicio de automatización para obtener las cookies
 * y tokens CSRF necesarios para autenticación.
 */
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WisproAutomationService } from '@infrastructure/automation';
import { WisproCredentials, WisproAuthResult } from '@infrastructure/automation';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { LoginRequestDto, LoginResponseDto } from '@presentation/dto';

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    private readonly wisproAutomationService: WisproAutomationService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Ejecuta el caso de uso de login
   * @param loginDto - Credenciales de login (email y password)
   * @returns Resultado de la autenticación con cookies y CSRF token
   */
  async execute(loginDto: LoginRequestDto): Promise<LoginResponseDto> {
    this.logger.log(`Iniciando proceso de login para: ${loginDto.email}`);

    try {
      const credentials: WisproCredentials = {
        email: loginDto.email,
        password: loginDto.password,
      };

      // Ejecutar automatización con Playwright
      const authResult: WisproAuthResult =
        await this.wisproAutomationService.loginAndExtractAuth(credentials);

      // Validar que tenemos credenciales válidas
      if (!authResult.csrfToken || !authResult.sessionCookie?.value) {
        this.logger.error('Login fallido: no se obtuvieron credenciales válidas');
        throw new HttpException(
          'Credenciales incorrectas. No se pudo completar el login.',
          HttpStatus.UNAUTHORIZED,
        );
      }

      // Crear payload para JWT
      const payload: JwtPayload = {
        sub: loginDto.email,
        csrfToken: authResult.csrfToken,
        sessionCookie: authResult.sessionCookie.value,
      };

      // Generar JWT token encriptado
      const accessToken = this.jwtService.sign(payload);
      this.logger.log('JWT token generado exitosamente');

      // Decodificar el JWT para obtener el payload (sin verificar, solo para mostrar)
      const jwtDecrypted = this.jwtService.decode(accessToken) as JwtPayload;

      // Mapear resultado a DTO de respuesta (JWT encriptado y desencriptado)
      const response: LoginResponseDto = {
        accessToken: accessToken,
        jwtDecrypted: {
          sub: jwtDecrypted.sub,
          csrfToken: jwtDecrypted.csrfToken,
          sessionCookie: jwtDecrypted.sessionCookie,
          iat: jwtDecrypted.iat,
          exp: jwtDecrypted.exp,
        },
      };

      this.logger.log(`Login completado exitosamente para: ${loginDto.email}`);
      return response;
    } catch (error) {
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error(`Error durante el login para ${loginDto.email}:`, error);
      throw new HttpException(
        'Error durante el proceso de login. Por favor, verifica tus credenciales e intenta nuevamente.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

