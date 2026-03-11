/**
 * Get Wispro Public Plans Use Case
 *
 * Use case que obtiene la lista de planes disponibles desde la API pública de Wispro.
 * Mapea la respuesta del API a DTOs con los campos necesarios.
 */
import { Injectable } from '@nestjs/common';
import { WisproPublicApiClientService } from '@infrastructure/external/wispro';
import { WisproPublicPlanDto } from '@presentation/dto/responses/wispro-public-plan.dto';
import { WisproPublicPlansResponse } from '@infrastructure/external/wispro/types';

@Injectable()
export class GetWisproPublicPlansUseCase {
  constructor(
    private readonly wisproPublicApiClient: WisproPublicApiClientService,
  ) {}

  /**
   * Ejecuta el use case para obtener los planes públicos de Wispro
   * @param queryParams - Parámetros opcionales de paginación (page, per_page)
   * @returns Array de DTOs con los planes (id, name, public_id, price)
   */
  async execute(
    queryParams?: {
      page?: number;
      per_page?: number;
    },
  ): Promise<WisproPublicPlanDto[]> {
    // Llamar al servicio de API pública
    const response: WisproPublicPlansResponse =
      await this.wisproPublicApiClient.getPlans(queryParams);

    // Mapear los datos de la respuesta a DTOs
    if (!response.data || !Array.isArray(response.data)) {
      return [];
    }

    return response.data.map((plan) => ({
      id: plan.id,
      name: plan.name,
      public_id: plan.public_id,
      price: plan.price,
    }));
  }
}
