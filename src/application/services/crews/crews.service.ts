/**
 * Crews Service
 * 
 * Servicio que orquesta las operaciones relacionadas con cuadrillas.
 * Maneja la creación, edición, y gestión de miembros de cuadrillas.
 * 
 * IMPORTANTE: Al crear una cuadrilla, se crea automáticamente una Location
 * de tipo CREW asociada para manejar el inventario de materiales de cuadrilla.
 */
import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, Like } from 'typeorm';
import { Crew, CrewMember, Location, Inventory, InventoryMovement, Material } from '@infrastructure/persistence/entities';
import { LocationType, MovementType } from '@domain/enums';

@Injectable()
export class CrewsService {
  private readonly logger = new Logger(CrewsService.name);

  constructor(
    @InjectRepository(Crew)
    private readonly crewRepository: Repository<Crew>,
    @InjectRepository(CrewMember)
    private readonly crewMemberRepository: Repository<CrewMember>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Crea una nueva cuadrilla y su Location asociada
   * 
   * Proceso:
   * 1. Valida que el líder no esté en otra cuadrilla activa
   * 2. Valida que los técnicos no estén en otras cuadrillas activas
   * 3. Crea la cuadrilla
   * 4. Crea los miembros (incluyendo el líder)
   * 5. Crea la Location de tipo CREW asociada
   */
  async createCrew(
    name: string,
    description: string | null,
    leaderTechnicianId: string,
    technicianIds: string[],
  ): Promise<Crew> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validar que el líder no esté en otra cuadrilla activa
      const existingLeaderCrew = await queryRunner.manager
        .createQueryBuilder(CrewMember, 'member')
        .innerJoin('member.crew', 'crew')
        .where('member.technicianId = :leaderId', { leaderId: leaderTechnicianId })
        .andWhere('crew.active = :active', { active: true })
        .getOne();

      if (existingLeaderCrew) {
        throw new ConflictException(
          `El técnico ${leaderTechnicianId} ya está asignado a otra cuadrilla activa`,
        );
      }

      // Validar que los técnicos no estén en otras cuadrillas activas
      const allTechnicianIds = [...new Set([leaderTechnicianId, ...technicianIds])];
      const existingMembers = await queryRunner.manager
        .createQueryBuilder(CrewMember, 'member')
        .innerJoin('member.crew', 'crew')
        .where('member.technicianId IN (:...ids)', { ids: allTechnicianIds })
        .andWhere('crew.active = :active', { active: true })
        .getMany();

      if (existingMembers.length > 0) {
        const conflictingIds = existingMembers.map((m) => m.technicianId);
        throw new ConflictException(
          `Los siguientes técnicos ya están asignados a cuadrillas activas: ${conflictingIds.join(', ')}`,
        );
      }

      // Crear la cuadrilla
      const crew = queryRunner.manager.create(Crew, {
        name,
        description,
        leaderTechnicianId,
        active: true,
      });
      const savedCrew = await queryRunner.manager.save(Crew, crew);

      // Crear los miembros (incluyendo el líder)
      const membersToCreate = allTechnicianIds.map((techId) => {
        const isLeader = techId === leaderTechnicianId;
        return queryRunner.manager.create(CrewMember, {
          crewId: savedCrew.id,
          technicianId: techId,
          role: isLeader ? 'LEADER' : null,
        });
      });
      await queryRunner.manager.save(CrewMember, membersToCreate);

      // Crear la Location de tipo CREW asociada
      const location = queryRunner.manager.create(Location, {
        type: LocationType.CREW,
        referenceId: savedCrew.id,
        name: `Cuadrilla: ${name}`,
        active: true, // Las cuadrillas nuevas se crean activas
      });
      await queryRunner.manager.save(Location, location);

      await queryRunner.commitTransaction();

      this.logger.log(`Cuadrilla creada: ${name} (ID: ${savedCrew.id}) con ${allTechnicianIds.length} miembros`);

      // Cargar la cuadrilla con sus miembros para retornarla
      return this.crewRepository.findOne({
        where: { id: savedCrew.id },
        relations: ['members'],
      }) as Promise<Crew>;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error al crear cuadrilla: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtiene todas las cuadrillas con filtros opcionales
   */
  async getAllCrews(active?: boolean, search?: string): Promise<Crew[]> {
    const queryBuilder = this.crewRepository
      .createQueryBuilder('crew')
      .leftJoinAndSelect('crew.members', 'members')
      .orderBy('crew.createdAt', 'DESC');

    if (active !== undefined) {
      queryBuilder.andWhere('crew.active = :active', { active });
    }

    if (search) {
      queryBuilder.andWhere(
        '(crew.name LIKE :search OR crew.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    return queryBuilder.getMany();
  }

  /**
   * Obtiene una cuadrilla por ID
   */
  async getCrewById(id: string): Promise<Crew> {
    const crew = await this.crewRepository.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!crew) {
      throw new NotFoundException(`Cuadrilla con ID ${id} no encontrada`);
    }

    return crew;
  }

  /**
   * Actualiza una cuadrilla existente
   */
  async updateCrew(
    id: string,
    name?: string,
    description?: string,
    leaderTechnicianId?: string,
    active?: boolean,
  ): Promise<Crew> {
    const crew = await this.crewRepository.findOne({ where: { id } });

    if (!crew) {
      throw new NotFoundException(`Cuadrilla con ID ${id} no encontrada`);
    }

    if (name !== undefined) {
      crew.name = name;
    }
    if (description !== undefined) {
      crew.description = description;
    }
    if (leaderTechnicianId !== undefined) {
      // Validar que el nuevo líder no esté en otra cuadrilla activa
      if (leaderTechnicianId !== crew.leaderTechnicianId) {
        const existingLeaderCrew = await this.crewMemberRepository
          .createQueryBuilder('member')
          .innerJoin('member.crew', 'crew')
          .where('member.technicianId = :leaderId', { leaderId: leaderTechnicianId })
          .andWhere('crew.active = :active', { active: true })
          .andWhere('crew.id != :crewId', { crewId: id })
          .getOne();

        if (existingLeaderCrew) {
          throw new ConflictException(
            `El técnico ${leaderTechnicianId} ya está asignado a otra cuadrilla activa`,
          );
        }
      }
      crew.leaderTechnicianId = leaderTechnicianId;
    }
    if (active !== undefined) {
      crew.active = active;
    }

    await this.crewRepository.save(crew);

    this.logger.log(`Cuadrilla actualizada: ${id}`);

    return this.crewRepository.findOne({
      where: { id },
      relations: ['members'],
    }) as Promise<Crew>;
  }

  /**
   * Agrega un técnico a una cuadrilla
   */
  async addMember(crewId: string, technicianId: string, role?: string): Promise<CrewMember> {
    const crew = await this.crewRepository.findOne({ where: { id: crewId } });

    if (!crew) {
      throw new NotFoundException(`Cuadrilla con ID ${crewId} no encontrada`);
    }

    if (!crew.active) {
      throw new BadRequestException('No se pueden agregar miembros a una cuadrilla inactiva');
    }

    // Validar que el técnico no esté en otra cuadrilla activa
    const existingMember = await this.crewMemberRepository
      .createQueryBuilder('member')
      .innerJoin('member.crew', 'crew')
      .where('member.technicianId = :techId', { techId: technicianId })
      .andWhere('crew.active = :active', { active: true })
      .andWhere('crew.id != :crewId', { crewId })
      .getOne();

    if (existingMember) {
      throw new ConflictException(
        `El técnico ${technicianId} ya está asignado a otra cuadrilla activa`,
      );
    }

    // Validar que no esté ya en esta cuadrilla
    const alreadyMember = await this.crewMemberRepository.findOne({
      where: { crewId, technicianId },
    });

    if (alreadyMember) {
      throw new ConflictException(`El técnico ${technicianId} ya es miembro de esta cuadrilla`);
    }

    const member = this.crewMemberRepository.create({
      crewId,
      technicianId,
      role: role || null,
    });

    const savedMember = await this.crewMemberRepository.save(member);

    this.logger.log(`Miembro agregado a cuadrilla ${crewId}: ${technicianId}`);

    return savedMember;
  }

  /**
   * Desactiva una cuadrilla (soft delete)
   * 
   * No elimina físicamente la cuadrilla para mantener el historial.
   * Marca la cuadrilla como inactiva y también desactiva su Location asociada.
   */
  async deactivateCrew(id: string): Promise<void> {
    const crew = await this.crewRepository.findOne({ where: { id } });

    if (!crew) {
      throw new NotFoundException(`Cuadrilla con ID ${id} no encontrada`);
    }

    if (!crew.active) {
      // Ya está desactivada, verificar si la Location también está desactivada
      const location = await this.locationRepository.findOne({
        where: {
          type: LocationType.CREW,
          referenceId: id,
        },
      });

      if (location && location.active) {
        // La cuadrilla está desactivada pero la Location no, desactivarla
        location.active = false;
        await this.locationRepository.save(location);
        this.logger.log(`Location de cuadrilla desactivada: ${location.id}`);
      }
      return;
    }

    // Desactivar cuadrilla
    crew.active = false;
    await this.crewRepository.save(crew);

    // Desactivar Location asociada
    const location = await this.locationRepository.findOne({
      where: {
        type: LocationType.CREW,
        referenceId: id,
      },
    });

    if (location) {
      location.active = false;
      await this.locationRepository.save(location);
      this.logger.log(`Cuadrilla y su Location desactivadas: ${id}`);
    } else {
      this.logger.warn(`No se encontró Location para la cuadrilla ${id}`);
    }
  }

  /**
   * Quita un técnico de una cuadrilla
   */
  async removeMember(crewId: string, memberId: string): Promise<void> {
    const member = await this.crewMemberRepository.findOne({
      where: { id: memberId, crewId },
      relations: ['crew'],
    });

    if (!member) {
      throw new NotFoundException(`Miembro con ID ${memberId} no encontrado en la cuadrilla ${crewId}`);
    }

    // Validar que no sea el único miembro
    const memberCount = await this.crewMemberRepository.count({
      where: { crewId },
    });

    if (memberCount <= 1) {
      throw new BadRequestException('No se puede quitar el último miembro de la cuadrilla');
    }

    await this.crewMemberRepository.remove(member);

    this.logger.log(`Miembro removido de cuadrilla ${crewId}: ${memberId}`);
  }

  /**
   * Calcula el preview de cómo se movería el material al reconfigurar cuadrillas
   * 
   * NO GUARDA NADA EN LA BASE DE DATOS. Solo calcula y devuelve el preview.
   * 
   * Proceso:
   * 1. Valida cuadrillas viejas
   * 2. Obtiene inventarios de cuadrillas viejas
   * 3. Calcula a dónde iría cada material según las reglas
   * 4. Devuelve preview con movimientos y resumen
   */
  async getReconfigurePreview(
    oldCrewIds: string[],
    newCrewsConfig: Array<{
      name: string;
      description?: string;
      leaderTechnicianId: string;
      technicianIds: string[];
    }>,
    leaderResolutions?: Array<{
      newCrewId: string; // ID temporal del frontend
      selectedLeaderId: string;
      conflictingLeaders: string[];
    }>,
  ): Promise<{
    materialMovements: Array<{
      materialId: string;
      materialName: string;
      fromCrewId: string;
      fromCrewName: string;
      toCrewId: string | null; // null = bodega, "temp-0" = nueva cuadrilla 1, etc.
      toCrewName: string;
      quantity: number;
      unit: string;
    }>;
    summary: {
      totalMaterialsToMove: number;
      totalQuantity: number;
      crewsAffected: number;
    };
    warnings: string[];
  }> {
    // 1. Validar cuadrillas viejas
    const oldCrews = await this.crewRepository.find({
      where: oldCrewIds.map((id) => ({ id })),
      relations: ['members'],
    });

    if (oldCrews.length !== oldCrewIds.length) {
      throw new NotFoundException('Una o más cuadrillas viejas no encontradas');
    }

    // 2. Obtener Locations e inventarios de cuadrillas viejas
    const oldCrewsWithInventory = await Promise.all(
      oldCrews.map(async (crew) => {
        const location = await this.locationRepository.findOne({
          where: { type: LocationType.CREW, referenceId: crew.id },
        });

        if (!location) {
          return { crew, location: null, inventory: [] };
        }

        const inventories = await this.inventoryRepository.find({
          where: { locationId: location.id },
          relations: ['material'],
        });

        return {
          crew,
          location,
          inventory: inventories.filter((inv) => Number(inv.stock) > 0),
        };
      }),
    );

    // 3. Calcular movimientos
    const materialMovements: Array<{
      materialId: string;
      materialName: string;
      fromCrewId: string;
      fromCrewName: string;
      toCrewId: string | null;
      toCrewName: string;
      quantity: number;
      unit: string;
    }> = [];

    const warnings: string[] = [];

    for (const { crew: oldCrew, location: oldLocation, inventory } of oldCrewsWithInventory) {
      if (!oldLocation) {
        warnings.push(`No se encontró Location para cuadrilla ${oldCrew.name}`);
        continue;
      }

      // Determinar a qué nueva cuadrilla va el material
      const targetNewCrewIndex = this.findTargetNewCrewIndex(
        oldCrew,
        newCrewsConfig,
        leaderResolutions || [],
      );

      let toCrewId: string | null = null;
      let toCrewName = 'Bodega Central';

      if (targetNewCrewIndex !== null) {
        toCrewId = `temp-${targetNewCrewIndex}`;
        toCrewName = newCrewsConfig[targetNewCrewIndex].name;
      } else {
        warnings.push(
          `No se pudo determinar destino para material de cuadrilla ${oldCrew.name}. Se moverá a bodega.`,
        );
      }

      // Procesar cada material del inventario
      for (const inventoryItem of inventory) {
        if (!inventoryItem.material) {
          continue;
        }

        const quantity = Number(inventoryItem.stock);
        if (quantity <= 0) {
          continue;
        }

        materialMovements.push({
          materialId: inventoryItem.material.id,
          materialName: inventoryItem.material.name,
          fromCrewId: oldCrew.id,
          fromCrewName: oldCrew.name,
          toCrewId,
          toCrewName,
          quantity,
          unit: inventoryItem.material.unit,
        });
      }
    }

    // 4. Calcular resumen
    const totalMaterialsToMove = new Set(materialMovements.map((m) => m.materialId)).size;
    const totalQuantity = materialMovements.reduce((sum, m) => sum + m.quantity, 0);
    const crewsAffected = oldCrews.length;

    // 5. Generar advertencias adicionales
    // Agrupar por destino para detectar si alguna nueva cuadrilla quedará con mucho material
    const movementsByDestination = materialMovements.reduce((acc, movement) => {
      const key = movement.toCrewId || 'WAREHOUSE';
      if (!acc[key]) {
        acc[key] = { name: movement.toCrewName, total: 0, materials: new Set() };
      }
      acc[key].total += movement.quantity;
      acc[key].materials.add(movement.materialId);
      return acc;
    }, {} as Record<string, { name: string; total: number; materials: Set<string> }>);

    for (const [destId, stats] of Object.entries(movementsByDestination)) {
      if (destId !== 'WAREHOUSE' && stats.total > 1000) {
        warnings.push(
          `La cuadrilla ${stats.name} quedará con ${stats.total.toFixed(2)} unidades de material. Considera redistribuir.`,
        );
      }
    }

    return {
      materialMovements,
      summary: {
        totalMaterialsToMove,
        totalQuantity,
        crewsAffected,
      },
      warnings,
    };
  }

  /**
   * Encuentra el índice de la nueva cuadrilla destino para el material de una cuadrilla vieja
   * Retorna null si no se encuentra destino (va a bodega)
   */
  private findTargetNewCrewIndex(
    oldCrew: Crew,
    newCrewsConfig: Array<{
      name: string;
      description?: string;
      leaderTechnicianId: string;
      technicianIds: string[];
    }>,
    leaderResolutions: Array<{
      newCrewId: string;
      selectedLeaderId: string;
      conflictingLeaders: string[];
    }>,
  ): number | null {
    if (!oldCrew.leaderTechnicianId) {
      return null; // Sin líder, no se puede determinar destino
    }

    const oldLeaderId = oldCrew.leaderTechnicianId;

    // Buscar en resoluciones de conflictos primero
    for (const resolution of leaderResolutions) {
      if (resolution.conflictingLeaders.includes(oldLeaderId)) {
        // El líder fue resuelto, buscar la nueva cuadrilla con el líder seleccionado
        const resolvedCrewIndex = newCrewsConfig.findIndex(
          (c) => c.leaderTechnicianId === resolution.selectedLeaderId,
        );
        if (resolvedCrewIndex !== -1) {
          return resolvedCrewIndex;
        }
      }
    }

    // Buscar en nuevas cuadrillas: el material va a la cuadrilla donde quedó el líder
    const targetCrewIndex = newCrewsConfig.findIndex(
      (crew) =>
        crew.leaderTechnicianId === oldLeaderId ||
        crew.technicianIds.includes(oldLeaderId),
    );

    return targetCrewIndex !== -1 ? targetCrewIndex : null;
  }

  /**
   * Reconfigura cuadrillas: crea nuevas cuadrillas y mueve material automáticamente
   * 
   * Proceso:
   * 1. Valida cuadrillas viejas
   * 2. Crea nuevas cuadrillas
   * 3. Obtiene Locations de cuadrillas viejas y nuevas
   * 4. Para cada cuadrilla vieja, determina a qué nueva cuadrilla va su material (según líder)
   * 5. Transfiere todo el inventario
   * 6. Desactiva cuadrillas viejas si se solicita
   */
  async reconfigureCrews(
    oldCrewIds: string[],
    newCrewsConfig: Array<{
      name: string;
      description?: string;
      leaderTechnicianId: string;
      technicianIds: string[];
    }>,
    leaderResolutions?: Array<{
      newCrewId: string; // ID temporal del frontend
      selectedLeaderId: string;
      conflictingLeaders: string[];
    }>,
    deactivateOldCrews: boolean = true,
  ): Promise<{
    newCrews: Crew[];
    materialMovements: Array<{
      materialId: string;
      materialName: string;
      fromCrewId: string;
      toCrewId: string;
      quantity: number;
      unit: string;
    }>;
    deactivatedCrews: string[];
  }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Validar cuadrillas viejas
      const oldCrews = await queryRunner.manager.find(Crew, {
        where: oldCrewIds.map((id) => ({ id })),
        relations: ['members'],
      });

      if (oldCrews.length !== oldCrewIds.length) {
        throw new NotFoundException('Una o más cuadrillas viejas no encontradas');
      }

      // 2. Crear nuevas cuadrillas
      // Excluir las cuadrillas viejas de la validación, ya que se van a desactivar
      const newCrews: Crew[] = [];
      for (const config of newCrewsConfig) {
        // Usar el método createCrew pero dentro de la transacción
        // Pasar oldCrewIds para excluirlas de la validación
        const newCrew = await this.createCrewInTransaction(
          queryRunner,
          config.name,
          config.description || null,
          config.leaderTechnicianId,
          config.technicianIds,
          oldCrewIds, // Excluir estas cuadrillas de la validación
        );
        newCrews.push(newCrew);
      }

      // 3. Obtener Locations de cuadrillas viejas y nuevas
      const oldLocations = await Promise.all(
        oldCrews.map(async (crew) => {
          const location = await queryRunner.manager.findOne(Location, {
            where: { type: LocationType.CREW, referenceId: crew.id },
          });
          return { crew, location };
        }),
      );

      const newLocations = await Promise.all(
        newCrews.map(async (crew) => {
          const location = await queryRunner.manager.findOne(Location, {
            where: { type: LocationType.CREW, referenceId: crew.id },
          });
          return { crew, location };
        }),
      );

      // 4. Mapear material: determinar a qué nueva cuadrilla va el material de cada cuadrilla vieja
      const materialMovements: Array<{
        materialId: string;
        materialName: string;
        fromCrewId: string;
        toCrewId: string;
        quantity: number;
        unit: string;
      }> = [];

      for (const { crew: oldCrew, location: oldLocation } of oldLocations) {
        if (!oldLocation) {
          this.logger.warn(`No se encontró Location para cuadrilla ${oldCrew.id}`);
          continue;
        }

        // Determinar a qué nueva cuadrilla va el material (usar índice)
        const targetNewCrewIndex = this.findTargetNewCrewIndex(
          oldCrew,
          newCrewsConfig,
          leaderResolutions || [],
        );

        if (targetNewCrewIndex === null) {
          this.logger.warn(
            `No se pudo determinar destino para material de cuadrilla ${oldCrew.id}. Se moverá a bodega.`,
          );
          // TODO: Mover a bodega si no hay destino
          continue;
        }

        const targetNewCrew = newCrews[targetNewCrewIndex];
        const targetLocation = newLocations[targetNewCrewIndex]?.location;

        if (!targetNewCrew) {
          this.logger.warn(
            `No se pudo determinar destino para material de cuadrilla ${oldCrew.id}. Se moverá a bodega.`,
          );
          // TODO: Mover a bodega si no hay destino
          continue;
        }

        if (!targetLocation) {
          this.logger.warn(`No se encontró Location para nueva cuadrilla ${targetNewCrew.id}`);
          continue;
        }

        // Obtener todo el inventario de la cuadrilla vieja
        const inventories = await queryRunner.manager.find(Inventory, {
          where: { locationId: oldLocation.id },
        });

        // Transferir cada material
        for (const inventory of inventories) {
          const material = await queryRunner.manager.findOne(Material, {
            where: { id: inventory.materialId },
          });

          if (!material) {
            continue;
          }

          const quantity = Number(inventory.stock);
          if (quantity <= 0) {
            continue; // No transferir si no hay stock
          }

          // Obtener o crear inventario en la nueva ubicación
          let newInventory = await queryRunner.manager.findOne(Inventory, {
            where: {
              materialId: inventory.materialId,
              locationId: targetLocation.id,
            },
          });

          if (!newInventory) {
            newInventory = queryRunner.manager.create(Inventory, {
              materialId: inventory.materialId,
              locationId: targetLocation.id,
              stock: 0,
              minStock: inventory.minStock, // Copiar minStock si existe
            });
          }

          // Transferir stock
          inventory.stock = 0; // Vaciar inventario viejo
          newInventory.stock = Number(newInventory.stock) + quantity;

          await queryRunner.manager.save(Inventory, inventory);
          await queryRunner.manager.save(Inventory, newInventory);

          // Crear movimiento
          const movement = queryRunner.manager.create(InventoryMovement, {
            materialId: inventory.materialId,
            fromLocationId: oldLocation.id,
            toLocationId: targetLocation.id,
            quantity: quantity,
            type: MovementType.TRANSFER,
          });
          await queryRunner.manager.save(InventoryMovement, movement);

          materialMovements.push({
            materialId: material.id,
            materialName: material.name,
            fromCrewId: oldCrew.id,
            toCrewId: targetNewCrew.id,
            quantity: quantity,
            unit: material.unit,
          });
        }
      }

      // 6. Desactivar cuadrillas viejas si se solicita
      const deactivatedCrews: string[] = [];
      if (deactivateOldCrews) {
        for (const oldCrew of oldCrews) {
          oldCrew.active = false;
          await queryRunner.manager.save(Crew, oldCrew);
          deactivatedCrews.push(oldCrew.id);
        }
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Reconfiguración completada: ${newCrews.length} nuevas cuadrillas creadas, ${materialMovements.length} materiales movidos`,
      );

      return {
        newCrews,
        materialMovements,
        deactivatedCrews,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error al reconfigurar cuadrillas: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Crea una cuadrilla dentro de una transacción (helper para reconfigureCrews)
   * 
   * @param excludeCrewIds IDs de cuadrillas a excluir de la validación (útil durante reconfiguración)
   */
  private async createCrewInTransaction(
    queryRunner: any,
    name: string,
    description: string | null,
    leaderTechnicianId: string,
    technicianIds: string[],
    excludeCrewIds: string[] = [],
  ): Promise<Crew> {
    // Validar que el líder no esté en otra cuadrilla activa (excepto las que se van a desactivar)
    const leaderQuery = queryRunner.manager
      .createQueryBuilder(CrewMember, 'member')
      .innerJoin('member.crew', 'crew')
      .where('member.technicianId = :leaderId', { leaderId: leaderTechnicianId })
      .andWhere('crew.active = :active', { active: true });

    if (excludeCrewIds.length > 0) {
      leaderQuery.andWhere('crew.id NOT IN (:...excludeIds)', { excludeIds: excludeCrewIds });
    }

    const existingLeaderCrew = await leaderQuery.getOne();

    if (existingLeaderCrew) {
      throw new ConflictException(
        `El técnico ${leaderTechnicianId} ya está asignado a otra cuadrilla activa`,
      );
    }

    // Validar que los técnicos no estén en otras cuadrillas activas (excepto las que se van a desactivar)
    const allTechnicianIds = [...new Set([leaderTechnicianId, ...technicianIds])];
    const membersQuery = queryRunner.manager
      .createQueryBuilder(CrewMember, 'member')
      .innerJoin('member.crew', 'crew')
      .where('member.technicianId IN (:...ids)', { ids: allTechnicianIds })
      .andWhere('crew.active = :active', { active: true });

    if (excludeCrewIds.length > 0) {
      membersQuery.andWhere('crew.id NOT IN (:...excludeIds)', { excludeIds: excludeCrewIds });
    }

    const existingMembers = await membersQuery.getMany();

    if (existingMembers.length > 0) {
      const conflictingIds = existingMembers.map((m) => m.technicianId);
      throw new ConflictException(
        `Los siguientes técnicos ya están asignados a cuadrillas activas: ${conflictingIds.join(', ')}`,
      );
    }

    // Crear la cuadrilla
    const crew = queryRunner.manager.create(Crew, {
      name,
      description,
      leaderTechnicianId,
      active: true,
    });
    const savedCrew = await queryRunner.manager.save(Crew, crew);

    // Crear los miembros
    const membersToCreate = allTechnicianIds.map((techId) => {
      const isLeader = techId === leaderTechnicianId;
      return queryRunner.manager.create(CrewMember, {
        crewId: savedCrew.id,
        technicianId: techId,
        role: isLeader ? 'LEADER' : null,
      });
    });
    await queryRunner.manager.save(CrewMember, membersToCreate);

    // Crear la Location
    const location = queryRunner.manager.create(Location, {
      type: LocationType.CREW,
      referenceId: savedCrew.id,
      name: `Cuadrilla: ${name}`,
    });
    await queryRunner.manager.save(Location, location);

    // Cargar con relaciones
    return queryRunner.manager.findOne(Crew, {
      where: { id: savedCrew.id },
      relations: ['members'],
    });
  }

}

