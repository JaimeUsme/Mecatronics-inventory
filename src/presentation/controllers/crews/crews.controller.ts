/**
 * Crews Controller
 * 
 * Controlador que expone los endpoints relacionados con cuadrillas.
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CrewsService } from '@application/services/crews';
import {
  CreateCrewRequestDto,
  UpdateCrewRequestDto,
  AddCrewMemberRequestDto,
  GetCrewsRequestDto,
  ReconfigureCrewsRequestDto,
  CrewDto,
  CrewMemberDto,
  ReconfigureCrewsResponseDto,
  ReconfigurePreviewResponseDto,
} from '@presentation/dto';

@Controller('crews')
export class CrewsController {
  constructor(private readonly crewsService: CrewsService) {}

  /**
   * Crea una nueva cuadrilla
   * 
   * POST /crews
   * 
   * Crea una cuadrilla con sus miembros y automáticamente crea
   * una Location de tipo CREW asociada para el inventario.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCrew(@Body() dto: CreateCrewRequestDto): Promise<CrewDto> {
    const crew = await this.crewsService.createCrew(
      dto.name,
      dto.description || null,
      dto.leaderTechnicianId,
      dto.technicianIds,
    );

    return this.mapCrewToDto(crew);
  }

  /**
   * Lista todas las cuadrillas
   * 
   * GET /crews
   * GET /crews?active=true
   * GET /crews?search=texto
   * 
   * Filtros disponibles:
   * - active: Filtrar por estado (true/false)
   * - search: Buscar por nombre o descripción
   */
  @Get()
  async getAllCrews(@Query() query: GetCrewsRequestDto): Promise<CrewDto[]> {
    const crews = await this.crewsService.getAllCrews(query.active, query.search);
    return crews.map((crew) => this.mapCrewToDto(crew));
  }

  /**
   * Obtiene una cuadrilla por ID
   * 
   * GET /crews/:id
   */
  @Get(':id')
  async getCrewById(@Param('id') id: string): Promise<CrewDto> {
    const crew = await this.crewsService.getCrewById(id);
    return this.mapCrewToDto(crew);
  }

  /**
   * Actualiza una cuadrilla
   * 
   * PUT /crews/:id
   */
  @Put(':id')
  async updateCrew(
    @Param('id') id: string,
    @Body() dto: UpdateCrewRequestDto,
  ): Promise<CrewDto> {
    const crew = await this.crewsService.updateCrew(
      id,
      dto.name,
      dto.description,
      dto.leaderTechnicianId,
      dto.active,
    );

    return this.mapCrewToDto(crew);
  }

  /**
   * Agrega un técnico a una cuadrilla
   * 
   * POST /crews/:crewId/members
   */
  @Post(':crewId/members')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('crewId') crewId: string,
    @Body() dto: AddCrewMemberRequestDto,
  ): Promise<CrewMemberDto> {
    const member = await this.crewsService.addMember(crewId, dto.technicianId, dto.role);
    return this.mapMemberToDto(member);
  }

  /**
   * Desactiva una cuadrilla
   * 
   * DELETE /crews/:id
   * 
   * Desactiva la cuadrilla (soft delete). No elimina físicamente
   * para mantener el historial de movimientos.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCrew(@Param('id') id: string): Promise<void> {
    return this.crewsService.deactivateCrew(id);
  }

  /**
   * Calcula el preview de cómo se movería el material al reconfigurar cuadrillas
   * 
   * POST /crews/reconfigure/preview
   * 
   * Este endpoint NO GUARDA NADA en la base de datos. Solo calcula y devuelve
   * un preview de cómo se movería el material según las reglas:
   * - El material sigue al líder de la cuadrilla vieja
   * - Si hay conflictos de líderes, usa las resoluciones proporcionadas
   * 
   * El frontend debe mostrar este preview al usuario y luego llamar a
   * POST /crews/reconfigure/confirm para ejecutar los cambios.
   */
  @Post('reconfigure/preview')
  @HttpCode(HttpStatus.OK)
  async getReconfigurePreview(
    @Body() dto: ReconfigureCrewsRequestDto,
  ): Promise<ReconfigurePreviewResponseDto> {
    const preview = await this.crewsService.getReconfigurePreview(
      dto.oldCrewIds,
      dto.newCrews,
      dto.leaderResolutions,
    );

    return {
      preview: {
        materialMovements: preview.materialMovements,
        summary: preview.summary,
      },
      warnings: preview.warnings,
    };
  }

  /**
   * Confirma y ejecuta la reconfiguración de cuadrillas
   * 
   * POST /crews/reconfigure/confirm
   * 
   * Este endpoint EJECUTA los cambios en la base de datos:
   * 1. Crea las nuevas cuadrillas especificadas
   * 2. Mueve el material de las cuadrillas viejas a las nuevas según las reglas
   * 3. Desactiva las cuadrillas viejas si se solicita
   * 
   * IMPORTANTE: Este endpoint debe ser llamado DESPUÉS de que el usuario
   * haya revisado el preview y confirmado los cambios.
   */
  @Post('reconfigure/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmReconfigureCrews(
    @Body() dto: ReconfigureCrewsRequestDto,
  ): Promise<ReconfigureCrewsResponseDto> {
    const result = await this.crewsService.reconfigureCrews(
      dto.oldCrewIds,
      dto.newCrews,
      dto.leaderResolutions,
      dto.deactivateOldCrews ?? true,
    );

    return {
      success: true,
      newCrews: result.newCrews.map((crew) => this.mapCrewToDto(crew)),
      materialMovements: result.materialMovements,
      deactivatedCrews: result.deactivatedCrews,
    };
  }

  /**
   * Quita un técnico de una cuadrilla
   * 
   * DELETE /crews/:crewId/members/:memberId
   */
  @Delete(':crewId/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('crewId') crewId: string,
    @Param('memberId') memberId: string,
  ): Promise<void> {
    return this.crewsService.removeMember(crewId, memberId);
  }

  /**
   * Mapea una entidad Crew a CrewDto
   */
  private mapCrewToDto(crew: any): CrewDto {
    return {
      id: crew.id,
      name: crew.name,
      leaderTechnicianId: crew.leaderTechnicianId,
      description: crew.description,
      active: crew.active,
      createdAt: crew.createdAt,
      members: (crew.members || []).map((m: any) => this.mapMemberToDto(m)),
    };
  }

  /**
   * Mapea una entidad CrewMember a CrewMemberDto
   */
  private mapMemberToDto(member: any): CrewMemberDto {
    return {
      id: member.id,
      crewId: member.crewId,
      technicianId: member.technicianId,
      role: member.role,
      createdAt: member.createdAt,
    };
  }
}

