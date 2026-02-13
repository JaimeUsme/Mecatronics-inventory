/**
 * Create Material Expense Use Case
 * 
 * Caso de uso que crea un gasto de material en una orden en la API de Wispro.
 * Convierte los datos de materiales a JSON antes de enviarlos.
 * Utiliza el cliente HTTP de Wispro para hacer la petición autenticada.
 */
import { Injectable, Logger } from '@nestjs/common';
import { WisproApiClientService } from '@infrastructure/external';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { CreateMaterialExpenseRequestDto, GetMaterialExpensesResponseDto, MaterialExpenseDto } from '@presentation/dto';
import { GetMaterialExpensesUseCase } from './get-material-expenses.use-case';

/**
 * Interfaz para la respuesta cruda de la API de Wispro
 * Wispro devuelve el feedback creado
 */
type WisproCreateFeedbackApiResponse = {
  id: string;
  order_id?: string;
  feedback_type?: string;
  comment?: string;
  body?: string;
  rating?: number;
  created_at: string;
  updated_at?: string;
  user?: {
    id: string;
    name: string;
    email?: string;
  };
  [key: string]: any;
};

@Injectable()
export class CreateMaterialExpenseUseCase {
  private readonly logger = new Logger(CreateMaterialExpenseUseCase.name);

  /**
   * ID del tipo de feedback de materiales en Wispro
   */
  private readonly MATERIAL_FEEDBACK_KIND_ID = 'bd40d1ad-5b89-42a4-a70f-2ec8b2392e16';

  constructor(
    private readonly wisproApiClient: WisproApiClientService,
    private readonly getMaterialExpensesUseCase: GetMaterialExpensesUseCase,
  ) {}

  /**
   * Ejecuta el caso de uso para crear un gasto de material en una orden
   * Convierte los materiales a JSON y los envía con el feedback_kind_id correcto
   * Después de crear el gasto, obtiene la lista completa de materiales
   * @param orderId - ID de la orden
   * @param requestDto - Datos de los materiales a registrar
   * @param jwtPayload - Payload del JWT token con las credenciales de Wispro
   * @returns Lista de materiales (incluyendo el nuevo)
   */
  async execute(
    orderId: string,
    requestDto: CreateMaterialExpenseRequestDto,
    jwtPayload: JwtPayload,
  ): Promise<GetMaterialExpensesResponseDto> {
    this.logger.log(
      `Creando gasto de material en la orden ${orderId} para usuario: ${jwtPayload.sub}`,
    );
    this.logger.debug(`Materiales recibidos: ${JSON.stringify(requestDto.materials)}`);

    const feedbacksUrl = `/order/orders/${orderId}/feedbacks`;

    // Convertir los materiales a JSON
    // Asegurar que cada material tenga quantityUsed y quantityDamaged
    const materialsForJson = requestDto.materials.map((material) => ({
      id: material.id,
      name: material.name,
      quantityUsed: material.quantityUsed || 0,
      quantityDamaged: material.quantityDamaged || 0,
      unit: material.unit,
      ...material, // Incluir cualquier otro campo adicional
    }));

    const materialsJson = JSON.stringify({
      materials: materialsForJson,
    });

    // Preparar el body según lo que espera Wispro
    const requestBody = {
      feedback: {
        body: materialsJson,
        feedback_kind_id: this.MATERIAL_FEEDBACK_KIND_ID,
      },
      locale: requestDto.locale || 'es',
    };

    this.logger.debug(`Body a enviar a Wispro: ${JSON.stringify(requestBody)}`);

    // Realizar petición autenticada a la API de Wispro
    const apiResponse: WisproCreateFeedbackApiResponse =
      await this.wisproApiClient.post<WisproCreateFeedbackApiResponse>(
        feedbacksUrl,
        requestBody,
        {
          csrfToken: jwtPayload.csrfToken,
          sessionCookie: jwtPayload.sessionCookie,
          customReferer: 'https://cloud.wispro.co/order/orders?locale=es',
        },
      );

    this.logger.log(
      `Gasto de material creado exitosamente: ${apiResponse.id} para la orden ${orderId}`,
    );

    // Después de crear el gasto, obtener la lista completa de materiales
    const allMaterials = await this.getMaterialExpensesUseCase.execute(
      orderId,
      jwtPayload,
    );

    this.logger.log(
      `${allMaterials.materials.length} materiales encontrados para la orden ${orderId}`,
    );

    return allMaterials;
  }
}

