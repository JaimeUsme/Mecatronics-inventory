/**
 * Wispro Session Manager Service
 *
 * Manages the refresh of Wispro authentication tokens when they expire.
 * Handles automatic token refresh using stored credentials.
 */
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { InternalUser } from '@infrastructure/persistence/entities';
import { WisproAutomationService } from '@infrastructure/automation';

export interface RefreshTokenResult {
  newCsrfToken: string;
  newSessionCookie: string;
  newJwt: string;
}

@Injectable()
export class WisproSessionManagerService {
  private readonly logger = new Logger(WisproSessionManagerService.name);

  constructor(
    @InjectRepository(InternalUser)
    private readonly internalUserRepository: Repository<InternalUser>,
    private readonly wisproAutomationService: WisproAutomationService,
    private readonly jwtService: JwtService,
  ) {}

  private readonly SALT_ROUNDS = 10;

  /**
   * Clave simétrica para cifrar/desifrar passwords de Wispro.
   */
  private getCryptoKey(): Buffer {
    const secret =
      process.env.WISPRO_CRYPTO_SECRET ||
      process.env.JWT_SECRET ||
      'change-this-secret-in-production';
    return crypto.createHash('sha256').update(secret).digest();
  }

  /**
   * Desencripta un password de Wispro
   */
  private decryptWisproPassword(encrypted: string): string {
    const key = this.getCryptoKey();
    const [ivB64, data] = encrypted.split(':');
    if (!ivB64 || !data) {
      throw new Error('Invalid Wispro password format');
    }
    const iv = Buffer.from(ivB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Refreshes the Wispro session for a user
   * Called when a 401 is received from Wispro API
   *
   * @param userId - Internal user ID
   * @returns New CSRF token, session cookie, and updated JWT
   * @throws UnauthorizedException if user not found or credentials invalid
   */
  async refreshWisproSession(userId: string): Promise<RefreshTokenResult> {
    this.logger.log(`Attempting to refresh Wispro session for user ${userId}`);

    const user = await this.internalUserRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException(`User ${userId} not found`);
    }

    // Verify user has Wispro credentials configured
    if (!user.wisproEmail || !user.wisproPasswordEncrypted) {
      throw new UnauthorizedException(
        `User ${userId} does not have Wispro credentials configured`,
      );
    }

    try {
      // Decrypt Wispro password
      const wisproPassword = this.decryptWisproPassword(
        user.wisproPasswordEncrypted,
      );

      // Perform automated login to Wispro
      const authResult = await this.wisproAutomationService.loginAndExtractAuth({
        email: user.wisproEmail,
        password: wisproPassword,
      });

      if (
        !authResult?.csrfToken ||
        !authResult.sessionCookie?.value
      ) {
        this.logger.warn(
          `Wispro login failed for user ${userId}: invalid credentials received`,
        );
        throw new UnauthorizedException(
          'Failed to refresh Wispro session - invalid credentials',
        );
      }

      // Generate new JWT with refreshed Wispro credentials
      const payload: any = {
        sub: user.id,
        id: user.id,
        email: user.email,
        name: user.name,
        position: user.position ?? null,
        type: user.wisproEmail ? 'internal' : 'internal', // Mantener el mismo tipo
        wispro: {
          linked: true,
          email: user.wisproEmail,
          csrfToken: authResult.csrfToken,
          sessionCookie: authResult.sessionCookie.value,
          loginSuccess: true,
        },
      };

      const newJwt = this.jwtService.sign(payload);

      this.logger.log(
        `Wispro session refreshed successfully for user ${userId}`,
      );

      return {
        newCsrfToken: authResult.csrfToken,
        newSessionCookie: authResult.sessionCookie.value,
        newJwt,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(
        `Error refreshing Wispro session for user ${userId}: ${error?.message}`,
      );
      throw new UnauthorizedException(
        'Failed to refresh Wispro session - ' + (error?.message || 'unknown error'),
      );
    }
  }
}
