/**
 * Get Mobile Material Expenses Use Case
 * 
 * Caso de uso que obtiene solo los gastos de material de una orden desde la API móvil de Wispro.
 * Filtra y devuelve únicamente los feedbacks que son de tipo material.
 * Parsea el body JSON de cada feedback para extraer los materiales con sus IDs.
 * Utiliza el cliente HTTP móvil de Wispro para hacer la petición autenticada.
 */
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WisproMobileApiClientService } from '@infrastructure/external/wispro/wispro-mobile-api-client.service';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { MaterialExpenseDto } from '@presentation/dto';
import { GetMobileMaterialExpensesResponseDto } from '@presentation/dto/responses/get-mobile-material-expenses-response.dto';

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
export class GetMobileMaterialExpensesUseCase {
  private readonly logger = new Logger(GetMobileMaterialExpensesUseCase.name);

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
   * Parsea el body JSON de un feedback de material y extrae los materiales
   * @param feedback - Feedback de tipo material
   * @returns Array de materiales parseados
   */
  private parseMaterialsFromFeedback(feedback: WisproMobileFeedback): MaterialExpenseDto[] {
    try {
      const body = feedback.body || '';
      if (!body) {
        return [];
      }

      const parsed = JSON.parse(body);
      
      // Verificar si tiene materials (array) o materialUsage
      if (Array.isArray(parsed.materials)) {
        return parsed.materials.map((material: any) => ({
          id: material.id || '',
          name: material.name || '',
          quantityUsed: material.quantityUsed ?? material.quantity ?? 0, // Compatibilidad con formato antiguo
          quantityDamaged: material.quantityDamaged ?? 0,
          unit: material.unit,
          ...material, // Incluir cualquier otro campo adicional
        }));
      } else if (parsed.materialUsage && Array.isArray(parsed.materialUsage)) {
        return parsed.materialUsage.map((material: any) => ({
          id: material.id || '',
          name: material.name || '',
          quantityUsed: material.quantityUsed ?? material.quantity ?? 0, // Compatibilidad con formato antiguo
          quantityDamaged: material.quantityDamaged ?? 0,
          unit: material.unit,
          ...material,
        }));
      }
      
      return [];
    } catch (error) {
      this.logger.warn(
        `Error parseando materiales del feedback ${feedback.id}: ${error}`,
      );
      return [];
    }
  }

  /**
   * Ejecuta el caso de uso para obtener solo los gastos de material de una orden móvil
   * Parsea el body JSON de cada feedback para extraer los materiales con sus IDs
   * Devuelve una lista plana de todos los materiales (sin agrupar por feedback)
   * @param orderId - ID de la orden
   * @param jwtPayload - Payload del JWT token con el token de Wispro mobile
   * @returns Lista plana de materiales gastados
   */
  async execute(
    orderId: string,
    jwtPayload: JwtPayload,
  ): Promise<GetMobileMaterialExpensesResponseDto> {
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

    this.logger.log(
      `Obteniendo gastos de material de la orden móvil ${orderId} para usuario: ${jwtPayload.sub}`,
    );

    // Obtener todos los feedbacks desde la API móvil de Wispro
    const allFeedbacks: WisproMobileFeedback[] = await this.wisproMobileApiClient.getOrderFeedbacks(
      authToken,
      orderId,
    );

    // Filtrar solo los feedbacks de material
    const materialFeedbacks = Array.isArray(allFeedbacks) 
      ? allFeedbacks.filter((f) => this.isMaterialFeedback(f))
      : [];

    // Parsear cada feedback de material y aplanar todos los materiales en un solo array
    const allMaterials: MaterialExpenseDto[] = [];
    
    materialFeedbacks.forEach((feedback) => {
      const materialsFromFeedback = this.parseMaterialsFromFeedback(feedback);
      allMaterials.push(...materialsFromFeedback);
    });

    // Agrupar materiales por ID y sumar las cantidades
    const groupedMaterials = this.groupAndSumMaterials(allMaterials);

    this.logger.log(
      `${allMaterials.length} materiales encontrados en ${materialFeedbacks.length} feedback(s), agrupados en ${groupedMaterials.length} materiales únicos para la orden móvil ${orderId}`,
    );

    return {
      materials: groupedMaterials,
    };
  }

  /**
   * Agrupa materiales por ID y suma las cantidades de quantityUsed y quantityDamaged
   * @param materials - Array de materiales a agrupar
   * @returns Array de materiales agrupados con cantidades sumadas
   */
  private groupAndSumMaterials(materials: MaterialExpenseDto[]): MaterialExpenseDto[] {
    const materialMap = new Map<string, MaterialExpenseDto>();

    materials.forEach((material) => {
      const materialId = material.id;
      
      if (!materialId) {
        // Si no tiene ID, lo agregamos tal cual (no se puede agrupar)
        materialMap.set(`${Date.now()}-${Math.random()}`, material);
        return;
      }

      if (materialMap.has(materialId)) {
        // Si ya existe, sumar las cantidades
        const existing = materialMap.get(materialId)!;
        existing.quantityUsed = (existing.quantityUsed || 0) + (material.quantityUsed || 0);
        existing.quantityDamaged = (existing.quantityDamaged || 0) + (material.quantityDamaged || 0);
      } else {
        // Si no existe, agregarlo al mapa
        materialMap.set(materialId, {
          ...material,
          quantityUsed: material.quantityUsed || 0,
          quantityDamaged: material.quantityDamaged || 0,
        });
      }
    });

    return Array.from(materialMap.values());
  }
}

