import { Injectable, Logger } from '@nestjs/common';
import { WisproApiWrapperService } from '@infrastructure/external';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { GetDeletedClientsRequestDto, GetDeletedClientsResponseDto } from '@presentation/dto';
import { mapWisproDeletedClientsToDto } from '@application/mappers';
import { TokenRefreshContextService } from '@application/services/token-refresh-context.service';

@Injectable()
export class GetDeletedClientsUseCase {
  private readonly logger = new Logger(GetDeletedClientsUseCase.name);

  constructor(
    private readonly wisproApiClient: WisproApiWrapperService,
    private readonly tokenRefreshContext: TokenRefreshContextService,
  ) {}

  async execute(
    requestDto: GetDeletedClientsRequestDto,
    jwtPayload: JwtPayload,
  ): Promise<GetDeletedClientsResponseDto> {
    this.logger.log(
      `Buscando clientes borrados con documento: "${requestDto.national_identification_number}" para usuario: ${jwtPayload.sub}`,
    );

    const perPage = requestDto.per_page || 20;
    const page = requestDto.page || 1;

    const queryParams = new URLSearchParams();
    queryParams.append('per_page', String(perPage));
    queryParams.append('page', String(page));
    queryParams.append('react', 'true');
    queryParams.append('q[paranoia]', 'only_deleted');

    if (requestDto.national_identification_number) {
      queryParams.append(
        'q[national_identification_number_cont]',
        requestDto.national_identification_number,
      );
    }

    const url = `/clients?${queryParams.toString()}`;

    const response = await this.wisproApiClient.get<any>(url, {
      csrfToken: jwtPayload.csrfToken,
      sessionCookie: jwtPayload.sessionCookie,
      userId: jwtPayload.sub,
      customReferer: 'https://cloud.wispro.co/clients?locale=es',
    });

    if (response.newJwt) {
      this.tokenRefreshContext.setNewJwt(response.newJwt);
    }

    const apiResponse = response.data;

    // Wispro devuelve [[clientes], {pagination}]
    let clientsArray: any[] = [];
    if (Array.isArray(apiResponse)) {
      if (apiResponse.length > 0 && Array.isArray(apiResponse[0])) {
        clientsArray = apiResponse[0];
      } else {
        clientsArray = apiResponse.filter((item: any) => !Array.isArray(item) && typeof item === 'object' && item?.id);
      }
    } else if (apiResponse && typeof apiResponse === 'object') {
      clientsArray = apiResponse.clients || apiResponse.data || [];
    }

    this.logger.log(`Clientes borrados encontrados: ${clientsArray.length}`);

    return {
      clients: mapWisproDeletedClientsToDto(clientsArray),
    };
  }
}
