/**
 * Get Profile Use Case
 * 
 * Caso de uso que obtiene la información del perfil del usuario autenticado
 * y el estado de conexión con Wispro.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { ProfileResponseDto, WisproConnectionStatusDto } from '@presentation/dto';
import { InternalUser } from '@infrastructure/persistence/entities';
import {
  WisproApiClientService,
  WisproCurrentUserResponse,
} from '@infrastructure/external';

@Injectable()
export class GetProfileUseCase {
  private readonly logger = new Logger(GetProfileUseCase.name);

  constructor(
    @InjectRepository(InternalUser)
    private readonly internalUserRepository: Repository<InternalUser>,
    private readonly wisproApiClient: WisproApiClientService,
  ) {}

  /**
   * Ejecuta el caso de uso para obtener el perfil del usuario
   * @param jwtPayload - Payload del JWT token
   * @returns Información del perfil del usuario y estado de conexión con Wispro
   */
  async execute(jwtPayload: JwtPayload): Promise<ProfileResponseDto> {
    // Determinar el estado de conexión con Wispro
    const wisproStatus = this.getWisproConnectionStatus(jwtPayload);

    // Obtener credenciales de Wispro del JWT
    let csrfToken: string | undefined;
    let sessionCookie: string | undefined;

    if (jwtPayload.type === 'internal' && jwtPayload.wispro) {
      // Usuario interno con credenciales de Wispro
      csrfToken = jwtPayload.wispro.csrfToken;
      sessionCookie = jwtPayload.wispro.sessionCookie;
    } else if (jwtPayload.csrfToken && jwtPayload.sessionCookie) {
      // Token directo de Wispro (solo para compatibilidad con tokens antiguos)
      csrfToken = jwtPayload.csrfToken;
      sessionCookie = jwtPayload.sessionCookie;
    }

    // Si es un token interno, obtener información del usuario interno
    if (jwtPayload.type === 'internal') {
      const internalUser = await this.internalUserRepository.findOne({
        where: { id: jwtPayload.sub },
      });

      if (!internalUser) {
        throw new NotFoundException('Usuario interno no encontrado');
      }

      // Si tiene credenciales válidas de Wispro, obtener información completa de Wispro API
      if (csrfToken && sessionCookie && wisproStatus.isConnected) {
        try {
          const apiResponse: WisproCurrentUserResponse =
            await this.wisproApiClient.get<WisproCurrentUserResponse>(
              '/users/current',
              {
                csrfToken,
                sessionCookie,
              },
            );

          return {
            id: internalUser.id,
            name: internalUser.name,
            email: internalUser.email,
            userType: 'internal',
            phone_mobile: apiResponse.user.userable.phone_mobile,
            userable_id: apiResponse.user.userable.id,
            wispro: wisproStatus,
          };
        } catch (error) {
          this.logger.warn(
            `No se pudo obtener información de Wispro para el usuario interno: ${error?.message}`,
          );
          // Si falla, devolver solo información interna
          return {
            id: internalUser.id,
            name: internalUser.name,
            email: internalUser.email,
            userType: 'internal',
            wispro: {
              ...wisproStatus,
              isConnected: false, // Si falla la petición, no está conectado
            },
          };
        }
      }

      // Usuario interno sin credenciales de Wispro o sin conexión activa
      return {
        id: internalUser.id,
        name: internalUser.name,
        email: internalUser.email,
        userType: 'internal',
        wispro: wisproStatus,
      };
    }

    // Token directo de Wispro (solo para compatibilidad con tokens antiguos)
    if (csrfToken && sessionCookie) {
      try {
        // Obtener información del usuario desde Wispro API
        const apiResponse: WisproCurrentUserResponse =
          await this.wisproApiClient.get<WisproCurrentUserResponse>(
            '/users/current',
            {
              csrfToken,
              sessionCookie,
            },
          );

        return {
          id: apiResponse.user.id,
          name: apiResponse.user.userable.name,
          email: apiResponse.user.email,
          userType: 'wispro',
          phone_mobile: apiResponse.user.userable.phone_mobile,
          userable_id: apiResponse.user.userable.id,
          wispro: wisproStatus,
        };
      } catch (error) {
        this.logger.warn(
          `No se pudo obtener información de Wispro para el usuario: ${error?.message}`,
        );
        // Si falla obtener info de Wispro pero tenemos el email en el JWT, devolver eso
        return {
          id: jwtPayload.sub,
          name: jwtPayload.name || jwtPayload.sub,
          email: jwtPayload.email || jwtPayload.sub,
          userType: 'wispro',
          wispro: {
            ...wisproStatus,
            isConnected: false, // Si falla la petición, no está conectado
          },
        };
      }
    }

    // Token sin credenciales válidas (no debería pasar, pero por si acaso)
    return {
      id: jwtPayload.sub,
      name: jwtPayload.name || jwtPayload.sub,
      email: jwtPayload.email || jwtPayload.sub,
      userType: 'wispro',
      wispro: {
        ...wisproStatus,
        isConnected: false,
      },
    };
  }

  /**
   * Determina el estado de conexión con Wispro basado en el JWT payload
   */
  private getWisproConnectionStatus(jwtPayload: JwtPayload): WisproConnectionStatusDto {
    // Caso 1: Token directo de Wispro (tiene csrfToken y sessionCookie directamente)
    if (jwtPayload.csrfToken && jwtPayload.sessionCookie) {
      return {
        isConnected: true,
        isLinked: true,
        loginSuccess: true,
        wisproEmail: jwtPayload.sub, // En tokens de Wispro, sub es el email
      };
    }

    // Caso 2: Token interno con Wispro vinculado
    if (jwtPayload.type === 'internal' && jwtPayload.wispro) {
      const wispro = jwtPayload.wispro;
      // isConnected solo es true si loginSuccess es explícitamente true
      // y tiene credenciales válidas (csrfToken y sessionCookie)
      const isConnected =
        wispro.linked === true &&
        wispro.loginSuccess === true &&
        !!wispro.csrfToken &&
        !!wispro.sessionCookie;

      return {
        isConnected,
        isLinked: wispro.linked || false,
        loginSuccess: wispro.loginSuccess,
        wisproEmail: wispro.email,
      };
    }

    // Caso 3: Token interno sin Wispro vinculado
    return {
      isConnected: false,
      isLinked: false,
    };
  }
}

