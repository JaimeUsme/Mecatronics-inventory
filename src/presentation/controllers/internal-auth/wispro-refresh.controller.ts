/**
 * Wispro Refresh Controller
 *
 * Endpoint para disparar la renovación de sesiones Wispro manualmente.
 * Diseñado para ser llamado por Cloud Scheduler en Cloud Run,
 * donde los cron jobs internos no son confiables (escala a cero).
 *
 * Protegido con un secret via header X-Cron-Secret para evitar
 * que cualquiera dispare logins de Playwright innecesariamente.
 * Configura la variable de entorno CRON_SECRET en Cloud Run.
 */
import { Controller, Post, HttpCode, HttpStatus, Headers, UnauthorizedException, Logger } from '@nestjs/common';
import { WisproSessionRefreshService } from '@infrastructure/external/wispro/wispro-session-refresh.service';

@Controller('internal')
export class WisproRefreshController {
  private readonly logger = new Logger(WisproRefreshController.name);

  constructor(
    private readonly wisproSessionRefreshService: WisproSessionRefreshService,
  ) {}

  /**
   * POST /internal/refresh-wispro-sessions
   *
   * Renueva todas las sesiones Wispro que estén expiradas o próximas a expirar.
   * Llamar desde Cloud Scheduler cada 15 minutos.
   *
   * Header requerido: X-Cron-Secret: <CRON_SECRET>
   */
  @Post('refresh-wispro-sessions')
  @HttpCode(HttpStatus.OK)
  async refreshWisproSessions(
    @Headers('x-cron-secret') secret: string,
  ): Promise<{ ok: boolean; message: string }> {
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      this.logger.warn('Intento de refresh con secret inválido');
      throw new UnauthorizedException('Secret inválido');
    }

    this.logger.log('Refresh de sesiones Wispro disparado externamente (Cloud Scheduler)');
    await this.wisproSessionRefreshService.refreshExpiredSessions();

    return { ok: true, message: 'Refresh de sesiones completado' };
  }
}
