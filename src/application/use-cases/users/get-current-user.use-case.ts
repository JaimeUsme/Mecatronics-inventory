/**
 * Get Current User Use Case
 * 
 * Caso de uso que obtiene la información del usuario actual desde la API de Wispro.
 * Utiliza el cliente HTTP de Wispro para hacer la petición autenticada.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  WisproApiClientService,
  WisproCurrentUserResponse,
} from '@infrastructure/external';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { GetCurrentUserResponseDto } from '@presentation/dto';

@Injectable()
export class GetCurrentUserUseCase {
  private readonly logger = new Logger(GetCurrentUserUseCase.name);

  constructor(private readonly wisproApiClient: WisproApiClientService) {}

  /**
   * Ejecuta el caso de uso para obtener el usuario actual
   * Las credenciales se obtienen del JWT token
   * @param jwtPayload - Payload del JWT token con las credenciales de Wispro
   * @returns Información del usuario actual (id, name, email, phone_mobile)
   */
  async execute(jwtPayload: JwtPayload): Promise<GetCurrentUserResponseDto> {
    this.logger.log('Obteniendo información del usuario actual desde Wispro API');

    // Realizar petición autenticada a la API de Wispro
    // Usar credenciales del JWT
    const apiResponse: WisproCurrentUserResponse =
      await this.wisproApiClient.get<WisproCurrentUserResponse>(
        '/users/current',
        {
          csrfToken: jwtPayload.csrfToken,
          sessionCookie: jwtPayload.sessionCookie,
        },
      );

    // Mapear respuesta de la API a nuestro DTO simplificado
    const response: GetCurrentUserResponseDto = {
      id: apiResponse.user.id,
      name: apiResponse.user.userable.name,
      email: apiResponse.user.email,
      phone_mobile: apiResponse.user.userable.phone_mobile,
      userable_id: apiResponse.user.userable.id,
    };

    this.logger.log(
      `Información del usuario obtenida exitosamente: ${response.email}`,
    );
    return response;
  }
}

