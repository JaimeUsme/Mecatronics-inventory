/**
 * Mobile Login Use Case
 * 
 * Caso de uso que maneja el login móvil.
 * Valida credenciales internas y sincroniza con el login de Wispro mobile.
 */
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { InternalUser } from '@infrastructure/persistence/entities';
import { WisproMobileApiClientService } from '@infrastructure/external/wispro/wispro-mobile-api-client.service';
import { WisproAutomationService } from '@infrastructure/automation';
import { MobileLoginResponseDto } from '@presentation/dto';

@Injectable()
export class MobileLoginUseCase {
  private readonly logger = new Logger(MobileLoginUseCase.name);

  constructor(
    @InjectRepository(InternalUser)
    private readonly internalUserRepository: Repository<InternalUser>,
    private readonly jwtService: JwtService,
    private readonly wisproMobileApiClient: WisproMobileApiClientService,
  ) {}

  /**
   * Ejecuta el caso de uso para login móvil
   * Valida credenciales internas y sincroniza con Wispro mobile si hay credenciales configuradas
   * @param email - Email del usuario interno
   * @param password - Contraseña del usuario interno
   * @returns JWT token con información combinada de internal_user y Wispro mobile
   */
  async execute(
    email: string,
    password: string,
  ): Promise<MobileLoginResponseDto> {
    this.logger.log(`Intentando login móvil para usuario: ${email}`);

    // Validar credenciales internas
    const user = await this.internalUserRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar que el usuario esté activo
    if (!user.active) {
      throw new UnauthorizedException('Usuario inactivo. Contacta al administrador.');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Intentar login a Wispro mobile si hay credenciales configuradas
    let wisproMobileData: any = undefined;
    if (user.wisproEmail && user.wisproPasswordEncrypted) {
      try {
        // Desencriptar password de Wispro (mismo método que InternalAuthService)
        const getCryptoKey = (): Buffer => {
          const secret =
            process.env.WISPRO_CRYPTO_SECRET ||
            process.env.JWT_SECRET ||
            'change-this-secret-in-production';
          return crypto.createHash('sha256').update(secret).digest();
        };

        const decryptWisproPassword = (encrypted: string): string => {
          const key = getCryptoKey();
          const [ivB64, data] = encrypted.split(':');
          if (!ivB64 || !data) {
            throw new Error('Formato de password Wispro inválido');
          }
          const iv = Buffer.from(ivB64, 'base64');
          const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
          let decrypted = decipher.update(data, 'base64', 'utf8');
          decrypted += decipher.final('utf8');
          return decrypted;
        };

        const wisproPassword = decryptWisproPassword(user.wisproPasswordEncrypted);
        
        // Hacer login a Wispro mobile
        const wisproResponse = await this.wisproMobileApiClient.signIn(
          user.wisproEmail,
          wisproPassword,
        );

        wisproMobileData = {
          token: wisproResponse.token,
          user: wisproResponse.user,
          isp: wisproResponse.isp,
          loginSuccess: true,
        };

        this.logger.log(
          `Login Wispro mobile exitoso para usuario interno ${user.email}`,
        );
      } catch (error) {
        this.logger.warn(
          `Error al intentar login Wispro mobile para usuario interno ${user.email}: ${error?.message}`,
        );
        wisproMobileData = {
          loginSuccess: false,
        };
      }
    }

    // Construir payload del JWT con información combinada
    const payload: any = {
      sub: user.id,
      email: user.email,
      name: user.name,
      type: 'mobile',
    };

    if (wisproMobileData) {
      payload.wisproMobile = wisproMobileData;
    }

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`Login móvil exitoso para usuario: ${user.email}`);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      wispro: wisproMobileData?.loginSuccess ? {
        token: wisproMobileData.token,
        user: wisproMobileData.user,
        isp: wisproMobileData.isp,
      } : undefined,
    };
  }
}

