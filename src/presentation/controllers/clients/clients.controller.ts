import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { GetDeletedClientsUseCase } from '@application/use-cases/clients';
import { GetClientLoginQrUseCase, GetClientLoginQrResponseDto } from '@application/use-cases/clients';
import { GetDeletedClientsRequestDto, GetDeletedClientsResponseDto } from '@presentation/dto';
import { JwtAuthGuard } from '@presentation/guards';
import { CurrentUser } from '@presentation/decorators';
import { JwtPayload } from '@infrastructure/auth/jwt';

@Controller('clients')
export class ClientsController {
  constructor(
    private readonly getDeletedClientsUseCase: GetDeletedClientsUseCase,
    private readonly getClientLoginQrUseCase: GetClientLoginQrUseCase,
  ) {}

  /**
   * Busca clientes eliminados en Wispro por número de documento
   *
   * GET /clients/deleted?national_identification_number=1002752021
   * Authorization: Bearer <jwt-token>
   */
  @Get('deleted')
  @UseGuards(JwtAuthGuard)
  async getDeletedClients(
    @Query() query: GetDeletedClientsRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<GetDeletedClientsResponseDto> {
    return this.getDeletedClientsUseCase.execute(query, user);
  }

  /**
   * Obtiene la imagen QR y la URL de login de un cliente en Wispro
   *
   * GET /clients/:client_id/login-qr
   * Authorization: Bearer <jwt-token>
   */
  @Get(':client_id/login-qr')
  @UseGuards(JwtAuthGuard)
  async getClientLoginQr(
    @Param('client_id') clientId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<GetClientLoginQrResponseDto> {
    return this.getClientLoginQrUseCase.execute(clientId, user);
  }
}
