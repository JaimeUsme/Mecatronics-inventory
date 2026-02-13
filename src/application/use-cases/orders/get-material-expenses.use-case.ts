/**
 * Get Material Expenses Use Case
 * 
 * Caso de uso que obtiene solo los gastos de material de una orden desde la API de Wispro.
 * Filtra y devuelve únicamente los feedbacks que son de tipo material.
 * Parsea el body JSON de cada feedback para extraer los materiales con sus IDs.
 * Devuelve una lista plana de todos los materiales (sin agrupar por feedback).
 * Utiliza el cliente HTTP de Wispro para hacer la petición autenticada.
 */
import { Injectable, Logger } from '@nestjs/common';
import { WisproApiClientService } from '@infrastructure/external';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { MaterialExpenseDto } from '@presentation/dto';
import { GetMaterialExpensesResponseDto } from '@presentation/dto/responses/get-material-expenses-response.dto';

/**
 * Interfaz para la respuesta cruda de la API de Wispro
 * Wispro devuelve un array de feedbacks
 */
type WisproOrderFeedbacksApiResponse = Array<{
  id: string;
  order_id?: string;
  feedback_type?: string;
  comment?: string;
  body?: string;
  feedback_kind_id?: string;
  rating?: number;
  created_at: string;
  updated_at?: string;
  user?: {
    id: string;
    name: string;
    email?: string;
  };
  [key: string]: any;
}>;

@Injectable()
export class GetMaterialExpensesUseCase {
  private readonly logger = new Logger(GetMaterialExpensesUseCase.name);

  /**
   * ID del tipo de feedback de materiales en Wispro
   */
  private readonly MATERIAL_FEEDBACK_KIND_ID = 'bd40d1ad-5b89-42a4-a70f-2ec8b2392e16';

  constructor(
    private readonly wisproApiClient: WisproApiClientService,
  ) {}

  /**
   * Determina si un feedback es de tipo material
   * @param feedback - Feedback a evaluar
   * @returns true si es un feedback de material
   */
  private isMaterialFeedback(feedback: any): boolean {
    // Verificar si el feedback_kind_id coincide
    if (feedback.feedback_kind_id === this.MATERIAL_FEEDBACK_KIND_ID) {
      return true;
    }

    // Intentar parsear el body como JSON
    try {
      const body = feedback.body || feedback.comment || '';
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
  private parseMaterialsFromFeedback(feedback: any): MaterialExpenseDto[] {
    try {
      const body = feedback.body || feedback.comment || '';
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
   * Ejecuta el caso de uso para obtener solo los gastos de material de una orden
   * Parsea el body JSON de cada feedback para extraer los materiales con sus IDs
   * Devuelve una lista plana de todos los materiales (sin agrupar por feedback)
   * @param orderId - ID de la orden
   * @param jwtPayload - Payload del JWT token con las credenciales de Wispro
   * @returns Lista plana de materiales gastados
   */
  async execute(
    orderId: string,
    jwtPayload: JwtPayload,
  ): Promise<GetMaterialExpensesResponseDto> {
    this.logger.log(
      `Obteniendo gastos de material de la orden ${orderId} para usuario: ${jwtPayload.sub}`,
    );

    const feedbacksUrl = `/order/orders/${orderId}/feedbacks`;

    // Realizar petición autenticada a la API de Wispro
    const apiResponse: WisproOrderFeedbacksApiResponse =
      await this.wisproApiClient.get<WisproOrderFeedbacksApiResponse>(
        feedbacksUrl,
        {
          csrfToken: jwtPayload.csrfToken,
          sessionCookie: jwtPayload.sessionCookie,
          customReferer: 'https://cloud.wispro.co/order/orders?locale=es',
        },
      );

    // Filtrar solo los feedbacks de material
    const materialFeedbacks = Array.isArray(apiResponse)
      ? apiResponse.filter((f) => this.isMaterialFeedback(f))
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
      `${allMaterials.length} materiales encontrados en ${materialFeedbacks.length} feedback(s), agrupados en ${groupedMaterials.length} materiales únicos para la orden ${orderId}`,
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

