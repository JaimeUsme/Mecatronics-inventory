/**
 * Wispro Session Refresh Service (Worker)
 *
 * Worker programado que mantiene actualizada la sesión de Wispro en la DB
 * para todos los usuarios que tienen credenciales de Wispro configuradas.
 *
 * Se ejecuta cada 15 minutos y renueva la sesión de cualquier usuario cuya
 * cookie esté a punto de expirar (menos de 30 minutos) o que no tenga sesión.
 *
 * La fecha de expiración se toma del campo `expires` del Set-Cookie de Wispro.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { InternalUser } from '@infrastructure/persistence/entities/internal-user.entity';
import { WisproAutomationService } from '@infrastructure/automation';

@Injectable()
export class WisproSessionRefreshService {
  private readonly logger = new Logger(WisproSessionRefreshService.name);
  // Renovar si faltan menos de 30 minutos para que expire
  private readonly REFRESH_THRESHOLD_MS = 30 * 60 * 1000;

  constructor(
    @InjectRepository(InternalUser)
    private readonly internalUserRepository: Repository<InternalUser>,
    private readonly wisproAutomationService: WisproAutomationService,
  ) {}

  /**
   * Busca usuarios con credenciales de Wispro cuya sesión haya expirado
   * o esté a menos de 30 minutos de expirar, y la renueva.
   * Llamar desde Cloud Scheduler vía POST /internal/refresh-wispro-sessions
   */
  async refreshExpiredSessions(): Promise<void> {
    this.logger.log('Iniciando ciclo de renovación de sesiones Wispro...');

    const thresholdDate = new Date(Date.now() + this.REFRESH_THRESHOLD_MS);

    const allEligibleUsers = await this.internalUserRepository
      .createQueryBuilder('u')
      .where('u.active = :active', { active: true })
      .andWhere('u.wisproEmail IS NOT NULL')
      .andWhere('u.wisproPasswordEncrypted IS NOT NULL')
      .andWhere(
        '(u.wisproSessionCookie IS NULL OR u.wisproSessionExpires IS NULL OR u.wisproSessionExpires < :threshold)',
        { threshold: thresholdDate },
      )
      .getMany();

    if (allEligibleUsers.length === 0) {
      this.logger.log('No hay sesiones Wispro que necesiten renovación.');
      return;
    }

    this.logger.log(
      `Renovando sesiones Wispro para ${allEligibleUsers.length} usuario(s)...`,
    );

    for (const user of allEligibleUsers) {
      await this.refreshUserSession(user);
    }

    this.logger.log('Ciclo de renovación de sesiones Wispro completado.');
  }

  /**
   * Renueva la sesión Wispro de un usuario específico.
   * Puede llamarse manualmente para forzar la renovación.
   */
  async refreshUserSession(user: InternalUser): Promise<boolean> {
    if (!user.wisproEmail || !user.wisproPasswordEncrypted) {
      this.logger.warn(
        `Usuario ${user.id} no tiene credenciales Wispro configuradas. Saltando.`,
      );
      return false;
    }

    try {
      const wisproPassword = this.decryptWisproPassword(user.wisproPasswordEncrypted);

      this.logger.log(`Renovando sesión Wispro para usuario: ${user.name} (${user.id})`);

      const authResult = await this.wisproAutomationService.loginAndExtractAuth({
        email: user.wisproEmail,
        password: wisproPassword,
      });

      if (!authResult?.csrfToken || !authResult.sessionCookie?.value) {
        this.logger.warn(
          `Renovación fallida para usuario ${user.id}: no se obtuvieron credenciales válidas`,
        );
        return false;
      }

      // Guardar sesión en DB
      user.wisproApiCsrfToken = authResult.csrfToken;
      user.wisproSessionCookie = authResult.sessionCookie.value;

      const cookieExpires = authResult.sessionCookie.expires;
      user.wisproSessionExpires = cookieExpires && cookieExpires > 0
        ? new Date(cookieExpires * 1000)
        : null;

      await this.internalUserRepository.save(user);

      this.logger.log(
        `Sesión Wispro renovada correctamente para usuario ${user.name} (${user.id}). Expira: ${user.wisproSessionExpires?.toISOString() ?? 'sin expiración definida'}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error al renovar sesión Wispro para usuario ${user.id}: ${error?.message}`,
        error?.stack,
      );
      return false;
    }
  }

  /**
   * Descifra el password de Wispro usando la misma clave que InternalAuthService.
   */
  private decryptWisproPassword(encrypted: string): string {
    const secret =
      process.env.WISPRO_CRYPTO_SECRET ||
      process.env.JWT_SECRET ||
      'change-this-secret-in-production';
    const key = crypto.createHash('sha256').update(secret).digest();
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
}
