/**
 * Create Mobile Material Expense Use Case
 * 
 * Caso de uso que crea un gasto de material en una orden desde la API móvil de Wispro.
 * Convierte los datos de materiales a JSON antes de enviarlos.
 * Utiliza el cliente HTTP móvil de Wispro para hacer la petición autenticada.
 */
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { WisproMobileApiClientService } from '@infrastructure/external/wispro/wispro-mobile-api-client.service';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { CreateMaterialExpenseRequestDto } from '@presentation/dto';
import { GetMobileMaterialExpensesResponseDto } from '@presentation/dto/responses/get-mobile-material-expenses-response.dto';
import { GetMobileMaterialExpensesUseCase } from './get-mobile-material-expenses.use-case';

@Injectable()
export class CreateMobileMaterialExpenseUseCase {
  private readonly logger = new Logger(CreateMobileMaterialExpenseUseCase.name);

  /**
   * ID del tipo de feedback de materiales en Wispro
   */
  private readonly MATERIAL_FEEDBACK_KIND_ID = 'bd40d1ad-5b89-42a4-a70f-2ec8b2392e16';

  constructor(
    private readonly wisproMobileApiClient: WisproMobileApiClientService,
    private readonly getMobileMaterialExpensesUseCase: GetMobileMaterialExpensesUseCase,
  ) {}

  /**
   * Ejecuta el caso de uso para crear un gasto de material en una orden móvil
   * Convierte los materiales a JSON y los envía con el feedback_kind_id correcto
   * Después de crear el gasto, obtiene la lista completa de materiales
   * @param orderId - ID de la orden
   * @param requestDto - Datos de los materiales a registrar
   * @param jwtPayload - Payload del JWT token con el token de Wispro mobile
   * @returns Lista plana de materiales (incluyendo los nuevos)
   */
  async execute(
    orderId: string,
    requestDto: CreateMaterialExpenseRequestDto,
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
      `Creando gasto de material en la orden móvil ${orderId} para usuario: ${jwtPayload.sub}`,
    );
    this.logger.debug(`Materiales recibidos: ${JSON.stringify(requestDto.materials)}`);

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

    // Nota: La API móvil de Wispro puede no aceptar feedback_kind_id directamente
    // Enviar solo el body JSON. Si Wispro requiere feedback_kind_id, necesitaríamos
    // modificar el método createOrderFeedback en WisproMobileApiClientService
    this.logger.debug(`Body JSON a enviar: ${materialsJson}`);

    // Llamar a la API móvil de Wispro para crear el feedback con feedback_kind_id
    const response = await this.wisproMobileApiClient.createOrderFeedback(
      authToken,
      orderId,
      materialsJson,
      this.MATERIAL_FEEDBACK_KIND_ID,
    );

    this.logger.log(
      `Gasto de material creado exitosamente para la orden móvil ${orderId}`,
    );

    // Después de crear el gasto, obtener la lista completa de materiales
    const allMaterials = await this.getMobileMaterialExpensesUseCase.execute(
      orderId,
      jwtPayload,
    );

    this.logger.log(
      `${allMaterials.materials.length} gastos de material encontrados para la orden móvil ${orderId}`,
    );

    return allMaterials;
  }
}

