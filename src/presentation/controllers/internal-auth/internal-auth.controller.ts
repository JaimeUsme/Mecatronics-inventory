/**
 * Internal Auth Controller
 *
 * Endpoints de autenticación interna (no dependen de Wispro).
 */
import { Controller, Post, Body, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { InternalAuthService } from '@application/services/internal-auth';
import {
  RegisterInternalUserRequestDto,
  LoginInternalUserRequestDto,
  LinkWisproRequestDto,
  InternalUserDto,
  InternalLoginResponseDto,
} from '@presentation/dto';

@Controller('internal-auth')
export class InternalAuthController {
  constructor(private readonly internalAuthService: InternalAuthService) {}

  /**
   * Registra un nuevo usuario interno
   *
   * POST /internal-auth/register
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterInternalUserRequestDto): Promise<InternalUserDto> {
    const user = await this.internalAuthService.register(
      dto.name,
      dto.email,
      dto.password,
      dto.wisproEmail,
      dto.wisproPassword,
    );
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  /**
   * Login interno
   *
   * POST /internal-auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginInternalUserRequestDto): Promise<InternalLoginResponseDto> {
    const { user, accessToken } = await this.internalAuthService.login(dto.email, dto.password);
    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Vincula una cuenta de Wispro a un usuario interno existente.
   *
   * POST /internal-auth/link-wispro
   *
   * Por simplicidad, el usuario interno se identifica por su email.
   * Este endpoint intenta hacer login a Wispro con las credenciales
   * proporcionadas; si el login es exitoso, guarda las credenciales
   * cifradas en la BD y devuelve { linked: true }. Si falla, devuelve
   * { linked: false }.
   */
  @Post('link-wispro')
  @HttpCode(HttpStatus.OK)
  async linkWispro(
    @Body() dto: LinkWisproRequestDto,
    @Headers('authorization') authHeader: string,
  ): Promise<{ linked: boolean }> {
    // Extraer token del header Authorization: Bearer <token>
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    if (!token) {
      // No uso guard para evitar conflictos con la estrategia de Wispro;
      // validamos manualmente aquí.
      throw new Error('Authorization header missing Bearer token');
    }

    // Decodificar y verificar el JWT interno
    const decoded: any = (this as any).internalAuthService['jwtService'].verify(token);
    const internalUserId = decoded.sub;

    const linked = await this.internalAuthService.linkWisproAccount(
      internalUserId,
      dto.wisproEmail,
      dto.wisproPassword,
    );
    return { linked };
  }
}


