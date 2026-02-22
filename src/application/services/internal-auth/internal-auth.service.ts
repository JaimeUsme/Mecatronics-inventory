/**
 * Internal Auth Service
 *
 * Servicio para manejar usuarios y login internos (no Wispro).
 * Genera JWT propios para autenticación interna y, opcionalmente,
 * incluye en el payload la sesión de Wispro si el usuario tiene
 * credenciales de Wispro configuradas.
 */
import { Injectable, ConflictException, UnauthorizedException, NotFoundException, Logger } from '@nestjs/common';
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
    position?: string,
    documentNumber?: string,
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
      position: position || null,
      documentNumber: documentNumber || null,
      active: true,
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

    // Verificar que el usuario esté activo
    if (!user.active) {
      throw new UnauthorizedException('Usuario inactivo. Contacta al administrador.');
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
            loginSuccess: true, // Login exitoso
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
      id: user.id,
      email: user.email,
      name: user.name,
      position: user.position ?? null,
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

  /**
   * Reintenta la conexión con Wispro para un usuario interno autenticado.
   * Usa las credenciales de Wispro guardadas en la BD para hacer login
   * y genera un nuevo JWT con las credenciales de Wispro incluidas.
   *
   * @param internalUserId - ID del usuario interno (del JWT)
   * @returns Nuevo accessToken con credenciales de Wispro, o null si falla
   */
  async reconnectWispro(internalUserId: string): Promise<{ accessToken: string | null; success: boolean }> {
    const user = await this.internalUserRepository.findOne({
      where: { id: internalUserId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario interno no encontrado');
    }

    // Verificar que el usuario tenga credenciales de Wispro configuradas
    if (!user.wisproEmail || !user.wisproPasswordEncrypted) {
      this.logger.warn(
        `Usuario interno ${internalUserId} no tiene credenciales de Wispro configuradas`,
      );
      return { accessToken: null, success: false };
    }

    try {
      // Intentar login a Wispro con las credenciales guardadas
      const wisproPassword = this.decryptWisproPassword(user.wisproPasswordEncrypted);
      const authResult = await this.wisproAutomationService.loginAndExtractAuth({
        email: user.wisproEmail,
        password: wisproPassword,
      });

      if (!authResult?.csrfToken || !authResult.sessionCookie?.value) {
        this.logger.warn(
          `Reconexión Wispro fallida para usuario interno ${internalUserId}: no se obtuvieron credenciales válidas`,
        );
        return { accessToken: null, success: false };
      }

      // Generar nuevo JWT con las credenciales de Wispro
      const payload: any = {
        sub: user.id,
        id: user.id,
        email: user.email,
        name: user.name,
        position: user.position ?? null,
        type: 'internal',
        wispro: {
          linked: true,
          email: user.wisproEmail,
          csrfToken: authResult.csrfToken,
          sessionCookie: authResult.sessionCookie.value,
          loginSuccess: true,
        },
      };

      const accessToken = this.jwtService.sign(payload);
      this.logger.log(`Reconexión Wispro exitosa para usuario interno ${internalUserId}`);

      return { accessToken, success: true };
    } catch (error) {
      this.logger.warn(
        `Error al reconectar Wispro para usuario interno ${internalUserId}: ${error?.message}`,
      );
      return { accessToken: null, success: false };
    }
  }

  /**
   * Agrega credenciales de Wispro al usuario actual, valida la conexión
   * y devuelve un nuevo JWT con las credenciales incluidas.
   *
   * Si la conexión falla, lanza una excepción y NO guarda las credenciales.
   * Si la conexión es exitosa, guarda las credenciales y devuelve un nuevo token.
   *
   * @param internalUserId - ID del usuario interno (del JWT)
   * @param wisproEmail - Email de la cuenta de Wispro
   * @param wisproPasswordPlain - Password de la cuenta de Wispro (sin cifrar)
   * @returns Nuevo accessToken con credenciales de Wispro
   * @throws UnauthorizedException si las credenciales son inválidas o el login falla
   */
  async addWisproCredentials(
    internalUserId: string,
    wisproEmail: string,
    wisproPasswordPlain: string,
  ): Promise<{ accessToken: string }> {
    const user = await this.internalUserRepository.findOne({
      where: { id: internalUserId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario interno no encontrado');
    }

    // Intentar login a Wispro con las credenciales proporcionadas
    // Si falla, lanzará una excepción y NO guardaremos las credenciales
    let authResult;
    try {
      authResult = await this.wisproAutomationService.loginAndExtractAuth({
        email: wisproEmail,
        password: wisproPasswordPlain,
      });

      if (!authResult?.csrfToken || !authResult.sessionCookie?.value) {
        this.logger.warn(
          `Login Wispro fallido para usuario interno ${internalUserId}: no se obtuvieron credenciales válidas`,
        );
        throw new UnauthorizedException(
          'Credenciales de Wispro inválidas. No se pudo establecer la conexión.',
        );
      }
    } catch (error) {
      // Si es una excepción de UnauthorizedException, la re-lanzamos
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Si es otro tipo de error, lo convertimos en UnauthorizedException
      this.logger.warn(
        `Error al validar credenciales de Wispro para usuario interno ${internalUserId}: ${error?.message}`,
      );
      throw new UnauthorizedException(
        `No se pudo conectar con Wispro: ${error?.message || 'Error desconocido'}`,
      );
    }

    // Si llegamos aquí, el login fue exitoso
    // Guardar credenciales cifradas de Wispro
    user.wisproEmail = wisproEmail;
    user.wisproPasswordEncrypted = this.encryptWisproPassword(wisproPasswordPlain);
    await this.internalUserRepository.save(user);

    this.logger.log(
      `Credenciales de Wispro agregadas y validadas correctamente para usuario interno ${internalUserId}`,
    );

    // Generar nuevo JWT con las credenciales de Wispro
    const payload: any = {
      sub: user.id,
      id: user.id,
      email: user.email,
      name: user.name,
      position: user.position ?? null,
      type: 'internal',
      wispro: {
        linked: true,
        email: user.wisproEmail,
        csrfToken: authResult.csrfToken,
        sessionCookie: authResult.sessionCookie.value,
        loginSuccess: true,
      },
    };

    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }

  /**
   * Obtiene usuarios internos paginados con estadísticas
   */
  async getInternalUsersPaginated(
    page: number = 1,
    perPage: number = 20,
    search?: string,
    active?: boolean,
  ): Promise<{
    users: InternalUser[];
    total: number;
    stats: { total: number; active: number; inactive: number };
  }> {
    const queryBuilder = this.internalUserRepository.createQueryBuilder('user');

    // Aplicar filtro de búsqueda si se proporciona
    if (search) {
      queryBuilder.where(
        '(user.name LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Aplicar filtro de activo/inactivo si se proporciona
    if (active !== undefined) {
      if (search) {
        queryBuilder.andWhere('user.active = :active', { active });
      } else {
        queryBuilder.where('user.active = :active', { active });
      }
    }

    // Obtener estadísticas (total, activos, inactivos)
    const total = await this.internalUserRepository.count();
    const activeCount = await this.internalUserRepository.count({
      where: { active: true },
    });
    const inactiveCount = await this.internalUserRepository.count({
      where: { active: false },
    });

    // Aplicar paginación
    const skip = (page - 1) * perPage;
    queryBuilder.skip(skip).take(perPage);

    // Ordenar por nombre
    queryBuilder.orderBy('user.name', 'ASC');

    const [users, totalFiltered] = await queryBuilder.getManyAndCount();

    return {
      users,
      total: totalFiltered,
      stats: {
        total,
        active: activeCount,
        inactive: inactiveCount,
      },
    };
  }

  /**
   * Desactiva un usuario (borrado lógico)
   */
  async deactivateUser(userId: string): Promise<void> {
    const user = await this.internalUserRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    if (!user.active) {
      throw new ConflictException(`El usuario "${user.name}" ya está inactivo`);
    }

    user.active = false;
    await this.internalUserRepository.save(user);
    this.logger.log(`Usuario desactivado: ${user.name} (${userId})`);
  }

  /**
   * Actualiza un usuario (solo para administradores)
   * Permite actualizar nombre, email y contraseña
   */
  async updateUser(
    userId: string,
    updates: {
      name?: string;
      email?: string;
      password?: string;
      position?: string;
      documentNumber?: string;
    },
  ): Promise<InternalUser> {
    const user = await this.internalUserRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    // Validar que el email no esté en uso por otro usuario
    if (updates.email && updates.email !== user.email) {
      const existing = await this.internalUserRepository.findOne({
        where: { email: updates.email },
      });
      if (existing) {
        throw new ConflictException(`El email ${updates.email} ya está en uso por otro usuario`);
      }
      user.email = updates.email;
    }

    if (updates.name !== undefined) {
      user.name = updates.name;
    }

    if (updates.position !== undefined) {
      user.position = updates.position;
    }

    if (updates.documentNumber !== undefined) {
      user.documentNumber = updates.documentNumber;
    }

    if (updates.password) {
      user.passwordHash = await bcrypt.hash(updates.password, this.SALT_ROUNDS);
    }

    const updated = await this.internalUserRepository.save(user);
    this.logger.log(`Usuario actualizado: ${updated.name} (${userId})`);
    return updated;
  }

  /**
   * Returns name, documentNumber and position of all active internal users.
   */
  async getActiveUsersBasicInfo(): Promise<{ name: string; documentNumber: string | null; position: string | null }[]> {
    const users = await this.internalUserRepository.find({
      where: { active: true },
      select: ['name', 'documentNumber', 'position'],
      order: { name: 'ASC' },
    });

    return users.map((u) => ({
      name: u.name,
      documentNumber: u.documentNumber ?? null,
      position: u.position ?? null,
    }));
  }

  /**
   * Actualiza el perfil del usuario autenticado
   * Solo permite actualizar email y contraseña, NO el nombre
   */
  async updateOwnProfile(
    userId: string,
    updates: {
      email?: string;
      password?: string;
    },
  ): Promise<InternalUser> {
    const user = await this.internalUserRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    // Validar que el email no esté en uso por otro usuario
    if (updates.email && updates.email !== user.email) {
      const existing = await this.internalUserRepository.findOne({
        where: { email: updates.email },
      });
      if (existing) {
        throw new ConflictException(`El email ${updates.email} ya está en uso por otro usuario`);
      }
      user.email = updates.email;
    }

    if (updates.password) {
      user.passwordHash = await bcrypt.hash(updates.password, this.SALT_ROUNDS);
    }

    const updated = await this.internalUserRepository.save(user);
    this.logger.log(`Perfil actualizado por el usuario: ${updated.name} (${userId})`);
    return updated;
  }
}


