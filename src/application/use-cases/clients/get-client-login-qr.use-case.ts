import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { WisproApiWrapperService } from '@infrastructure/external';
import { JwtPayload } from '@infrastructure/auth/jwt';

export interface GetClientLoginQrResponseDto {
  type: 'image_base64';
  data: string;
  mime_type: string;
  filename: string;
  caption: string;
}

@Injectable()
export class GetClientLoginQrUseCase {
  private readonly logger = new Logger(GetClientLoginQrUseCase.name);

  constructor(
    private readonly wisproApiClient: WisproApiWrapperService,
  ) {}

  async execute(
    clientId: string,
    jwtPayload: JwtPayload,
  ): Promise<GetClientLoginQrResponseDto> {
    this.logger.log(`Obteniendo QR de login para cliente: ${clientId}`);

    const html = await this.wisproApiClient.getHtml(`/clients/${clientId}`, {
      csrfToken: jwtPayload.csrfToken,
      sessionCookie: jwtPayload.sessionCookie,
      userId: jwtPayload.sub,
      customReferer: 'https://cloud.wispro.co/clients?locale=es',
    });

    // Extraer la URL de login del atributo data-clipboard-text
    const loginUrlMatch = html.match(/data-clipboard-text="([^"]+)"/);
    if (!loginUrlMatch) {
      throw new NotFoundException(`No se encontró el enlace de login para el cliente ${clientId}`);
    }
    const loginUrl = loginUrlMatch[1];

    // Extraer la imagen base64 del div hidden-xs hidden-sm
    // Formato en el HTML: data:<mime_type>;base64,<data>
    const imgMatch = html.match(
      /class="hidden-xs hidden-sm"[\s\S]*?<img[^>]*src="data:([^;]+);base64,([^"]+)"/,
    );
    if (!imgMatch) {
      throw new NotFoundException(`No se encontró la imagen QR para el cliente ${clientId}`);
    }
    const mimeType = imgMatch[1];
    const base64Data = imgMatch[2];
    const extension = mimeType.split('/')[1] || 'png';

    this.logger.log(`QR de login obtenido exitosamente para cliente: ${clientId}`);

    return {
      type: 'image_base64',
      data: base64Data,
      mime_type: mimeType,
      filename: `qr_login_${clientId}.${extension}`,
      caption: `QR Login: ${loginUrl}`,
    };
  }
}
