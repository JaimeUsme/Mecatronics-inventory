/**
 * Get Mobile Order Feedbacks Use Case
 * 
 * Caso de uso que obtiene los feedbacks de una orden desde la API móvil de Wispro.
 * Excluye los feedbacks de tipo material (solo devuelve feedbacks normales/comentarios).
 * Utiliza el cliente HTTP móvil de Wispro para hacer la petición autenticada.
 */
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WisproMobileApiClientService } from '@infrastructure/external/wispro/wispro-mobile-api-client.service';
import { JwtPayload } from '@infrastructure/auth/jwt';

/**
 * Interfaz para un feedback de la API móvil de Wispro
 */
interface WisproMobileFeedback {
  id: string;
  body: string;
  created_at: string;
  creatable_id: string;
  creatable_type: string;
  feedback_kind?: {
    name: string;
    id?: string;
  };
  [key: string]: any;
}

@Injectable()
export class GetMobileOrderFeedbacksUseCase {
  private readonly logger = new Logger(GetMobileOrderFeedbacksUseCase.name);

  /**
   * ID del tipo de feedback de materiales en Wispro
   */
  private readonly MATERIAL_FEEDBACK_KIND_ID = 'bd40d1ad-5b89-42a4-a70f-2ec8b2392e16';

  constructor(
    private readonly wisproMobileApiClient: WisproMobileApiClientService,
  ) {}

  /**
   * Determina si un feedback es de tipo material
   * @param feedback - Feedback a evaluar
   * @returns true si es un feedback de material
   */
  private isMaterialFeedback(feedback: WisproMobileFeedback): boolean {
    // Verificar si el feedback_kind_id coincide (si está disponible)
    if (feedback.feedback_kind?.id === this.MATERIAL_FEEDBACK_KIND_ID) {
      return true;
    }

    // Intentar parsear el body como JSON
    try {
      const body = feedback.body || '';
      if (!body) {
        return false;
      }

      const parsed = JSON.parse(body);
      // Verificar si contiene materials (array) o materialUsage
      return (
        Array.isArray(parsed.materials) || parsed.materialUsage !== undefined
      );
    } catch {
      // Si no se puede parsear, no es un feedback de material
      return false;
    }
  }

  /**
   * Ejecuta el caso de uso para obtener los feedbacks de una orden móvil
   * Las credenciales se obtienen del JWT token
   * @param orderId - ID de la orden
   * @param jwtPayload - Payload del JWT token con el token de Wispro mobile
   * @returns Array de feedbacks desde la API móvil de Wispro (sin transformar)
   */
  async execute(
    orderId: string,
    jwtPayload: JwtPayload,
  ): Promise<any> {
    // Validar que el token tenga credenciales de Wispro mobile
    if (
      !jwtPayload.wisproMobile ||
      !jwtPayload.wisproMobile.token ||
      jwtPayload.wisproMobile.loginSuccess !== true
    ) {
      this.logger.warn(
        `Token móvil sin credenciales válidas de Wispro mobile para usuario: ${jwtPayload.sub}`,
      );
      throw new UnauthorizedException(
        'Token inválido: faltan credenciales de Wispro mobile. Usa /mobile/v1/login para autenticarte.',
      );
    }

    const authToken = jwtPayload.wisproMobile.token;

    this.logger.debug(
      `Obteniendo feedbacks de orden móvil ${orderId} para usuario: ${jwtPayload.sub}`,
    );

    // Llamar a la API móvil de Wispro
    const allFeedbacks: WisproMobileFeedback[] = await this.wisproMobileApiClient.getOrderFeedbacks(
      authToken,
      orderId,
    );

    // Filtrar los feedbacks de material (solo devolver feedbacks normales/comentarios)
    const normalFeedbacks = Array.isArray(allFeedbacks)
      ? allFeedbacks.filter((f) => !this.isMaterialFeedback(f))
      : [];

    this.logger.log(
      `${normalFeedbacks.length} feedbacks normales encontrados (${(Array.isArray(allFeedbacks) ? allFeedbacks.length : 0) - normalFeedbacks.length} materiales excluidos) para la orden móvil ${orderId}`,
    );

    // Devolver solo los feedbacks normales (sin materiales)
    return normalFeedbacks;
  }
}

