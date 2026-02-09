/**
 * Internal Auth Controller
 *
 * Endpoints de autenticación interna (no dependen de Wispro).
 */
import { Controller, Post, Body, HttpCode, HttpStatus, Headers, UseGuards } from '@nestjs/common';
import { InternalAuthService } from '@application/services/internal-auth';
import {
  RegisterInternalUserRequestDto,
  LoginInternalUserRequestDto,
  LinkWisproRequestDto,
  InternalUserDto,
  InternalLoginResponseDto,
  ReconnectWisproResponseDto,
} from '@presentation/dto';
import { JwtPermissiveGuard } from '@presentation/guards/jwt-permissive.guard';
import { CurrentUser } from '@presentation/decorators';
import { JwtPayload } from '@infrastructure/auth/jwt';

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

  /**
   * Reintenta la conexión con Wispro para el usuario autenticado.
   *
   * POST /internal-auth/reconnect-wispro
   *
   * Requiere: Authorization: Bearer <token-interno>
   *
   * Este endpoint intenta hacer login a Wispro usando las credenciales
   * guardadas del usuario. Si es exitoso, devuelve un nuevo JWT con las
   * credenciales de Wispro incluidas. Si falla, devuelve success: false.
   *
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Nuevo accessToken con credenciales de Wispro, o null si falla
   */
  @Post('reconnect-wispro')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtPermissiveGuard) // Permite tokens sin credenciales de Wispro
  async reconnectWispro(
    @CurrentUser() user: JwtPayload,
  ): Promise<ReconnectWisproResponseDto> {
    const internalUserId = user.sub;

    const result = await this.internalAuthService.reconnectWispro(internalUserId);

    if (!result.success) {
      return {
        accessToken: null,
        success: false,
        message: 'No se pudo reconectar con Wispro. Verifica que las credenciales estén correctas.',
      };
    }

    return {
      accessToken: result.accessToken,
      success: true,
      message: 'Reconexión exitosa con Wispro.',
    };
  }

  /**
   * Agrega credenciales de Wispro al usuario actual, valida la conexión
   * y devuelve un nuevo JWT con las credenciales incluidas.
   *
   * POST /internal-auth/add-wispro-credentials
   *
   * Requiere: Authorization: Bearer <token-interno>
   *
   * Este endpoint intenta hacer login a Wispro con las credenciales proporcionadas.
   * Si la conexión falla, devuelve un error HTTP y NO guarda las credenciales.
   * Si la conexión es exitosa, guarda las credenciales en la BD y devuelve un nuevo JWT.
   *
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @param dto - Credenciales de Wispro (email y password)
   * @returns Nuevo accessToken con credenciales de Wispro incluidas
   * @throws UnauthorizedException si las credenciales son inválidas o el login falla
   */
  @Post('add-wispro-credentials')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtPermissiveGuard) // Permite tokens sin credenciales de Wispro
  async addWisproCredentials(
    @CurrentUser() user: JwtPayload,
    @Body() dto: LinkWisproRequestDto,
  ): Promise<ReconnectWisproResponseDto> {
    const internalUserId = user.sub;

    // Este método lanzará una excepción si las credenciales son inválidas
    const result = await this.internalAuthService.addWisproCredentials(
      internalUserId,
      dto.wisproEmail,
      dto.wisproPassword,
    );

    return {
      accessToken: result.accessToken,
      success: true,
      message: 'Credenciales de Wispro agregadas y validadas correctamente.',
    };
  }
}


