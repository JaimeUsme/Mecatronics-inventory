/**
 * Internal Auth Service
 *
 * Servicio para manejar usuarios y login internos (no Wispro).
 * Genera JWT propios para autenticación interna y, opcionalmente,
 * incluye en el payload la sesión de Wispro si el usuario tiene
 * credenciales de Wispro configuradas.
 */
import { Injectable, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { InternalUser } from '@infrastructure/persistence/entities';
import { WisproAutomationService } from '@infrastructure/automation';

@Injectable()
export class InternalAuthService {
  private readonly logger = new Logger(InternalAuthService.name);

  constructor(
    @InjectRepository(InternalUser)
    private readonly internalUserRepository: Repository<InternalUser>,
    private readonly jwtService: JwtService,
    private readonly wisproAutomationService: WisproAutomationService,
  ) {}

  private readonly SALT_ROUNDS = 10;

  /**
   * Clave simétrica para cifrar/desifrar passwords de Wispro.
   * Usa una key derivada de una secret env (WISPRO_CRYPTO_SECRET o JWT_SECRET).
   */
  private getCryptoKey(): Buffer {
    const secret =
      process.env.WISPRO_CRYPTO_SECRET ||
      process.env.JWT_SECRET ||
      'change-this-secret-in-production';
    // Derivar una clave de 32 bytes (AES-256)
    return crypto.createHash('sha256').update(secret).digest();
  }

  private encryptWisproPassword(plain: string): string {
    const key = this.getCryptoKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(plain, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    // Guardamos iv:cipher en base64
    return `${iv.toString('base64')}:${encrypted}`;
  }

  private decryptWisproPassword(encrypted: string): string {
    const key = this.getCryptoKey();
    const [ivB64, data] = encrypted.split(':');
    if (!ivB64 || !data) {
      throw new Error('Formato de password Wispro inválido');
    }
    const iv = Buffer.from(ivB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Registra un nuevo usuario interno
   */
  async register(
    name: string,
    email: string,
    password: string,
    wisproEmail?: string,
    wisproPasswordPlain?: string,
  ): Promise<InternalUser> {
    const existing = await this.internalUserRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    const user = this.internalUserRepository.create({
      name,
      email,
      passwordHash,
      wisproEmail: wisproEmail || null,
      wisproPasswordEncrypted: wisproPasswordPlain
        ? this.encryptWisproPassword(wisproPasswordPlain)
        : null,
    });

    return this.internalUserRepository.save(user);
  }

  /**
   * Valida credenciales y devuelve el usuario + JWT si son correctas.
   * Si el usuario tiene credenciales de Wispro configuradas, intenta
   * hacer login a Wispro en segundo plano y agrega la sesión de Wispro
   * al payload del JWT. Si falla, el login interno igualmente es exitoso.
   */
  async login(email: string, password: string): Promise<{ user: InternalUser; accessToken: string }> {
    const user = await this.internalUserRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Intentar login a Wispro si hay credenciales configuradas
    let wisproPayload: any = undefined;
    if (user.wisproEmail && user.wisproPasswordEncrypted) {
      try {
        const wisproPassword = this.decryptWisproPassword(user.wisproPasswordEncrypted);
        const authResult = await this.wisproAutomationService.loginAndExtractAuth({
          email: user.wisproEmail,
          password: wisproPassword,
        });

        if (authResult?.csrfToken && authResult.sessionCookie?.value) {
          wisproPayload = {
            linked: true,
            email: user.wisproEmail,
            csrfToken: authResult.csrfToken,
            sessionCookie: authResult.sessionCookie.value,
          };
        } else {
          this.logger.warn(
            `Login Wispro fallido para usuario interno ${user.email}: no se obtuvieron credenciales válidas`,
          );
          wisproPayload = {
            linked: true,
            loginSuccess: false,
          };
        }
      } catch (error) {
        this.logger.warn(
          `Error al intentar login Wispro para usuario interno ${user.email}: ${error?.message}`,
        );
        wisproPayload = {
          linked: true,
          loginSuccess: false,
        };
      }
    }

    // Payload del JWT interno con información opcional de Wispro
    const payload: any = {
      sub: user.id,
      email: user.email,
      name: user.name,
      type: 'internal',
    };

    if (wisproPayload) {
      payload.wispro = wisproPayload;
    }

    const accessToken = this.jwtService.sign(payload);

    return { user, accessToken };
  }

   /**
    * Vincula (o actualiza) la cuenta de Wispro para un usuario interno.
    * Hace login a Wispro para comprobar credenciales. Solo si el login
    * es exitoso, guarda wisproEmail y wisproPasswordEncrypted.
    *
    * Devuelve true si la vinculación fue exitosa, false si las credenciales
    * de Wispro son inválidas o el login falla.
    */
  async linkWisproAccount(
    internalUserId: string,
    wisproEmail: string,
    wisproPasswordPlain: string,
  ): Promise<boolean> {
    const user = await this.internalUserRepository.findOne({
      where: { id: internalUserId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario interno no encontrado');
    }

    try {
      // Probar login en Wispro
      const authResult = await this.wisproAutomationService.loginAndExtractAuth({
        email: wisproEmail,
        password: wisproPasswordPlain,
      });

      if (!authResult?.csrfToken || !authResult.sessionCookie?.value) {
        this.logger.warn(
          `Vinculación Wispro fallida para usuario interno ${internalUserId}: login Wispro sin credenciales válidas`,
        );
        return false;
      }

      // Guardar credenciales cifradas de Wispro
      user.wisproEmail = wisproEmail;
      user.wisproPasswordEncrypted = this.encryptWisproPassword(wisproPasswordPlain);
      await this.internalUserRepository.save(user);

      this.logger.log(`Cuenta de Wispro vinculada correctamente para usuario interno ${internalUserId}`);
      return true;
    } catch (error) {
      this.logger.warn(
        `Error al vincular Wispro para usuario interno ${internalUserId}: ${error?.message}`,
      );
      return false;
    }
  }
}


