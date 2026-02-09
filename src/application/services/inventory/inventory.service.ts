/**
 * Inventory Service
 * 
 * Servicio que orquesta las operaciones de inventario.
 * Implementa la lógica de negocio para transferencias, consumos y consultas.
 * 
 * IMPORTANTE: Todas las operaciones que modifican stock deben:
 * 1. Actualizar la tabla Inventory (stock actual)
 * 2. Crear un registro en InventoryMovement (histórico)
 * 3. Ejecutarse dentro de una transacción
 */
import { Injectable, Logger, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, Like } from 'typeorm';
import {
  Material,
  Location,
  Inventory,
  InventoryMovement,
  ServiceOrderMaterial,
  CrewMember,
} from '@infrastructure/persistence/entities';
import { LocationType, MovementType, ConsumptionType, MaterialOwnershipType } from '@domain/enums';
import { OrderCrewSnapshotService } from '../orders/order-crew-snapshot.service';

export interface TransferMaterialDto {
  materialId: string;
  fromLocationId: string; // Ubicación origen (bodega, técnico o cuadrilla)
  toLocationId: string; // Ubicación destino (bodega, técnico o cuadrilla)
  quantity: number;
  damagedQuantity?: number; // Opcional: cantidad de material que se dañó durante la transferencia
  technicianId?: string; // Opcional: ID del técnico que realiza la transferencia
}

export interface ConsumeMaterialDto {
  materialId: string;
  technicianLocationId?: string; // Opcional: si no se proporciona, se busca automáticamente
  quantity: number;
  serviceOrderId: string;
  technicianId: string;
  consumptionType?: ConsumptionType; // Opcional, por defecto USED
}

export interface WarehouseInventoryDto {
  materialId: string;
  materialName: string;
  materialCategory: string;
  materialImages?: string[] | null;
  unit: string;
  stock: number;
  minStock: number;
  locationId: string;
  locationName: string;
  locationType: string;
  locationReferenceId?: string | null;
  lastUpdated?: Date | null;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(Location)
    private readonly locationRepository: Repository<Location>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepository: Repository<InventoryMovement>,
    @InjectRepository(ServiceOrderMaterial)
    private readonly serviceOrderMaterialRepository: Repository<ServiceOrderMaterial>,
    @InjectRepository(CrewMember)
    private readonly crewMemberRepository: Repository<CrewMember>,
    private readonly dataSource: DataSource,
    private readonly orderCrewSnapshotService: OrderCrewSnapshotService,
  ) {}

  /**
   * Transfiere material entre ubicaciones (bodega, técnico, cuadrilla)
   * 
   * Proceso:
   * 1. Valida que existan material y ubicaciones
   * 2. Verifica stock suficiente en ubicación origen
   * 3. Resta stock de ubicación origen
   * 4. Suma stock a ubicación destino (crea registro si no existe)
   * 5. Crea movimiento de tipo TRANSFER
   * 
   * Reglas de minStock:
   * - Solo se copia minStock si la ubicación destino es WAREHOUSE
   * - Técnicos y cuadrillas no tienen minStock (null)
   * 
   * Todo dentro de una transacción.
   */
  async transferMaterialToTechnician(dto: TransferMaterialDto): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validar material
      const material = await queryRunner.manager.findOne(Material, {
        where: { id: dto.materialId },
      });
      if (!material) {
        throw new NotFoundException(`Material con ID ${dto.materialId} no encontrado`);
      }

      // Validar ubicaciones
      const fromLocation = await queryRunner.manager.findOne(Location, {
        where: { id: dto.fromLocationId },
      });
      const toLocation = await queryRunner.manager.findOne(Location, {
        where: { id: dto.toLocationId },
      });

      if (!fromLocation || !toLocation) {
        throw new NotFoundException('Una o ambas ubicaciones no encontradas');
      }

      // Validar que no sea la misma ubicación
      if (fromLocation.id === toLocation.id) {
        throw new BadRequestException('No se puede transferir material a la misma ubicación');
      }

      // Obtener o crear inventario de ubicación origen
      let fromInventory = await queryRunner.manager.findOne(Inventory, {
        where: {
          materialId: dto.materialId,
          locationId: dto.fromLocationId,
        },
      });

      if (!fromInventory) {
        // Si no existe, crear con stock 0
        fromInventory = queryRunner.manager.create(Inventory, {
          materialId: dto.materialId,
          locationId: dto.fromLocationId,
          stock: 0,
          minStock: fromLocation.type === LocationType.WAREHOUSE ? material.minStock : null,
        });
      }

      // Validar cantidad dañada
      const damagedQuantity = dto.damagedQuantity || 0;
      if (damagedQuantity < 0) {
        throw new BadRequestException('La cantidad de material dañado no puede ser negativa');
      }
      if (damagedQuantity > dto.quantity) {
        throw new BadRequestException(
          `La cantidad de material dañado (${damagedQuantity}) no puede ser mayor que la cantidad total transferida (${dto.quantity})`,
        );
      }

      // Calcular cantidad que llegó bien al destino
      const goodQuantity = dto.quantity - damagedQuantity;

      // Validar stock suficiente
      if (Number(fromInventory.stock) < dto.quantity) {
        throw new BadRequestException(
          `Stock insuficiente en ${fromLocation.name}. Disponible: ${fromInventory.stock}, Solicitado: ${dto.quantity}`,
        );
      }

      // Restar stock de ubicación origen (toda la cantidad, incluyendo la dañada)
      fromInventory.stock = Number(fromInventory.stock) - dto.quantity;
      await queryRunner.manager.save(Inventory, fromInventory);

      // Obtener o crear inventario de ubicación destino
      let toInventory = await queryRunner.manager.findOne(Inventory, {
        where: {
          materialId: dto.materialId,
          locationId: dto.toLocationId,
        },
      });

      if (!toInventory) {
        // Determinar minStock según tipo de ubicación destino
        const minStockForDestination =
          toLocation.type === LocationType.WAREHOUSE ? material.minStock : null;

        toInventory = queryRunner.manager.create(Inventory, {
          materialId: dto.materialId,
          locationId: dto.toLocationId,
          stock: 0,
          minStock: minStockForDestination,
        });
      }

      // Sumar stock a ubicación destino (solo la cantidad que llegó bien)
      if (goodQuantity > 0) {
        toInventory.stock = Number(toInventory.stock) + goodQuantity;
        await queryRunner.manager.save(Inventory, toInventory);
      }

      // Crear movimiento TRANSFER para la cantidad que llegó bien
      if (goodQuantity > 0) {
        const transferMovement = queryRunner.manager.create(InventoryMovement, {
          materialId: dto.materialId,
          fromLocationId: dto.fromLocationId,
          toLocationId: dto.toLocationId,
          quantity: goodQuantity,
          type: MovementType.TRANSFER,
          technicianId: dto.technicianId || null,
        });
        await queryRunner.manager.save(InventoryMovement, transferMovement);
      }

      // Crear movimiento DAMAGED para la cantidad que se dañó
      if (damagedQuantity > 0) {
        const damagedMovement = queryRunner.manager.create(InventoryMovement, {
          materialId: dto.materialId,
          fromLocationId: dto.fromLocationId,
          toLocationId: null, // Material dañado no llega a ningún destino
          quantity: damagedQuantity,
          type: MovementType.DAMAGED,
          technicianId: dto.technicianId || null,
        });
        await queryRunner.manager.save(InventoryMovement, damagedMovement);
      }

      await queryRunner.commitTransaction();

      if (damagedQuantity > 0) {
        this.logger.log(
          `Material ${material.name} transferido: ${goodQuantity} ${material.unit} de ${fromLocation.name} a ${toLocation.name}. ${damagedQuantity} ${material.unit} dañados durante la transferencia.`,
        );
      } else {
        this.logger.log(
          `Material ${material.name} transferido: ${dto.quantity} ${material.unit} de ${fromLocation.name} a ${toLocation.name}`,
        );
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error al transferir material: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Registra consumo de material en una orden de servicio
   * 
   * Proceso:
   * 1. Valida material y ubicación del técnico
   * 2. Verifica stock suficiente en el técnico
   * 3. Resta stock SOLO del técnico (NO toca bodega)
   * 4. Crea registro en ServiceOrderMaterial
   * 5. Crea movimiento de tipo CONSUMPTION
   * 
   * Todo dentro de una transacción.
   */
  async consumeMaterialInOrder(dto: ConsumeMaterialDto): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validar material
      const material = await queryRunner.manager.findOne(Material, {
        where: { id: dto.materialId },
      });
      if (!material) {
        throw new NotFoundException(`Material con ID ${dto.materialId} no encontrado`);
      }

      // Buscar ubicación del técnico
      let technicianLocation: Location | null = null;

      if (dto.technicianLocationId) {
        // Si se proporciona technicianLocationId, usarlo directamente
        technicianLocation = await queryRunner.manager.findOne(Location, {
          where: { id: dto.technicianLocationId },
        });

        if (!technicianLocation) {
          throw new NotFoundException('Ubicación del técnico no encontrada');
        }

        if (technicianLocation.type !== LocationType.TECHNICIAN) {
          throw new BadRequestException('La ubicación debe ser de un técnico');
        }
      } else {
        // Si no se proporciona, buscar automáticamente por technicianId
        technicianLocation = await queryRunner.manager.findOne(Location, {
          where: {
            type: LocationType.TECHNICIAN,
            referenceId: dto.technicianId,
          },
        });

        if (!technicianLocation) {
          throw new NotFoundException(
            `No se encontró una ubicación de inventario para el técnico ${dto.technicianId}. Asegúrate de que el técnico tenga una Location creada.`,
          );
        }
      }

      // Obtener inventario del técnico
      let technicianInventory = await queryRunner.manager.findOne(Inventory, {
        where: {
          materialId: dto.materialId,
          locationId: technicianLocation.id,
        },
      });

      if (!technicianInventory) {
        technicianInventory = queryRunner.manager.create(Inventory, {
          materialId: dto.materialId,
          locationId: technicianLocation.id,
          stock: 0,
        });
      }

      // Validar stock suficiente
      if (technicianInventory.stock < dto.quantity) {
        throw new BadRequestException(
          `Stock insuficiente en inventario del técnico. Disponible: ${technicianInventory.stock}, Solicitado: ${dto.quantity}`,
        );
      }

      // Restar stock del técnico (NO tocar bodega)
      technicianInventory.stock = Number(technicianInventory.stock) - dto.quantity;
      await queryRunner.manager.save(Inventory, technicianInventory);

      // Crear registro en ServiceOrderMaterial
      const serviceOrderMaterial = queryRunner.manager.create(ServiceOrderMaterial, {
        serviceOrderId: dto.serviceOrderId,
        materialId: dto.materialId,
        quantityUsed: dto.quantity,
        technicianId: dto.technicianId,
        consumptionType: dto.consumptionType || ConsumptionType.USED, // Por defecto USED
      });
      await queryRunner.manager.save(ServiceOrderMaterial, serviceOrderMaterial);

      // Crear movimiento de tipo CONSUMPTION
      const movement = queryRunner.manager.create(InventoryMovement, {
        materialId: dto.materialId,
        fromLocationId: technicianLocation.id, // Se consume del técnico
        toLocationId: null, // No va a ningún lado
        quantity: dto.quantity,
        type: MovementType.CONSUMPTION,
        serviceOrderId: dto.serviceOrderId,
        technicianId: dto.technicianId,
      });
      await queryRunner.manager.save(InventoryMovement, movement);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Material ${material.name} consumido: ${dto.quantity} ${material.unit} en orden ${dto.serviceOrderId} por técnico ${dto.technicianId}`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error al consumir material: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Consume múltiples materiales en una orden de servicio
   * 
   * Proceso:
   * 1. Para cada material, determina si es TECHNICIAN o CREW según ownershipType
   * 2. Si es TECHNICIAN: busca Location del técnico
   * 3. Si es CREW: busca la cuadrilla del técnico y luego su Location
   * 4. Procesa quantityUsed (crea consumo tipo USED)
   * 5. Procesa quantityDamaged (crea consumo tipo DAMAGED)
   * 
   * Todo dentro de una transacción.
   */
  async consumeMaterialsInOrder(
    materials: Array<{ materialId: string; quantityUsed: number; quantityDamaged: number }>,
    serviceOrderId: string,
    technicianId: string,
  ): Promise<void> {
    // ✅ CREAR SNAPSHOT DE CUADRILLA SOLO SI ES EL PRIMER CONSUMO DE ESTA ORDEN
    // Verificar si ya existe un snapshot para esta orden
    const existingSnapshot = await this.orderCrewSnapshotService.getSnapshot(serviceOrderId);
    
    if (!existingSnapshot) {
      // Es el primer consumo de materiales en esta orden, crear snapshot de la cuadrilla actual
      this.logger.log(
        `Primer consumo de materiales en orden ${serviceOrderId}, creando snapshot de cuadrilla para técnico ${technicianId}`,
      );
      try {
        await this.orderCrewSnapshotService.getOrCreateSnapshot(serviceOrderId, technicianId);
      } catch (error) {
        // Si falla la creación del snapshot, solo logueamos el error pero continuamos con el consumo
        // No queremos que falle todo el proceso por un problema con el snapshot
        this.logger.warn(
          `Error al crear snapshot de cuadrilla para orden ${serviceOrderId}: ${error.message}`,
        );
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validar que haya al menos un material
      if (!materials || materials.length === 0) {
        throw new BadRequestException('Debe proporcionar al menos un material');
      }

      // Procesar cada material
      for (const materialData of materials) {
        const { materialId, quantityUsed, quantityDamaged } = materialData;

        // Validar que al menos una cantidad sea mayor a 0
        if (quantityUsed <= 0 && quantityDamaged <= 0) {
          this.logger.warn(
            `Material ${materialId} tiene quantityUsed y quantityDamaged en 0, se omite`,
          );
          continue;
        }

        // Validar material
        const material = await queryRunner.manager.findOne(Material, {
          where: { id: materialId },
        });
        if (!material) {
          throw new NotFoundException(`Material con ID ${materialId} no encontrado`);
        }

        // Determinar la Location según ownershipType
        let location: Location | null = null;

        if (material.ownershipType === MaterialOwnershipType.TECHNICIAN) {
          // Buscar Location del técnico
          location = await queryRunner.manager.findOne(Location, {
            where: {
              type: LocationType.TECHNICIAN,
              referenceId: technicianId,
            },
          });

          if (!location) {
            throw new NotFoundException(
              `No se encontró una ubicación de inventario para el técnico ${technicianId}. Asegúrate de que el técnico tenga una Location creada.`,
            );
          }
        } else if (material.ownershipType === MaterialOwnershipType.CREW) {
          // Buscar la cuadrilla del técnico
          const crewMember = await queryRunner.manager
            .createQueryBuilder(CrewMember, 'member')
            .innerJoin('member.crew', 'crew')
            .where('member.technicianId = :technicianId', { technicianId })
            .andWhere('crew.active = :active', { active: true })
            .getOne();

          if (!crewMember) {
            throw new NotFoundException(
              `El técnico ${technicianId} no está asignado a ninguna cuadrilla activa. Los materiales de tipo CREW requieren que el técnico pertenezca a una cuadrilla.`,
            );
          }

          // Buscar Location de la cuadrilla
          location = await queryRunner.manager.findOne(Location, {
            where: {
              type: LocationType.CREW,
              referenceId: crewMember.crewId,
            },
          });

          if (!location) {
            throw new NotFoundException(
              `No se encontró una ubicación de inventario para la cuadrilla ${crewMember.crewId}.`,
            );
          }
        } else {
          throw new BadRequestException(
            `Tipo de propiedad de material no válido: ${material.ownershipType}`,
          );
        }

        // Procesar quantityUsed si es mayor a 0
        if (quantityUsed > 0) {
          await this.processConsumption(
            queryRunner,
            material,
            location,
            quantityUsed,
            serviceOrderId,
            technicianId,
            ConsumptionType.USED,
          );
        }

        // Procesar quantityDamaged si es mayor a 0
        if (quantityDamaged > 0) {
          await this.processConsumption(
            queryRunner,
            material,
            location,
            quantityDamaged,
            serviceOrderId,
            technicianId,
            ConsumptionType.DAMAGED,
          );
        }
      }

      await queryRunner.commitTransaction();
      this.logger.log(
        `Consumo de ${materials.length} materiales registrado exitosamente en orden ${serviceOrderId} por técnico ${technicianId}`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error al consumir materiales: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Método auxiliar para procesar un consumo individual
   * (usado por consumeMaterialsInOrder)
   */
  private async processConsumption(
    queryRunner: any,
    material: Material,
    location: Location,
    quantity: number,
    serviceOrderId: string,
    technicianId: string,
    consumptionType: ConsumptionType,
  ): Promise<void> {
    // Obtener o crear inventario
    let inventory = await queryRunner.manager.findOne(Inventory, {
      where: {
        materialId: material.id,
        locationId: location.id,
      },
    });

    if (!inventory) {
      inventory = queryRunner.manager.create(Inventory, {
        materialId: material.id,
        locationId: location.id,
        stock: 0,
        minStock: null, // Técnicos y cuadrillas no tienen minStock
      });
    }

    // Validar stock suficiente
    if (inventory.stock < quantity) {
      throw new BadRequestException(
        `Stock insuficiente para material ${material.name} (${material.id}). Disponible: ${inventory.stock}, Solicitado: ${quantity}`,
      );
    }

    // Restar stock
    inventory.stock = Number(inventory.stock) - quantity;
    await queryRunner.manager.save(Inventory, inventory);

    // Crear registro en ServiceOrderMaterial (solo para consumo en órdenes)
    // Si es DAMAGED, también lo registramos para tener trazabilidad
    const serviceOrderMaterial = queryRunner.manager.create(ServiceOrderMaterial, {
      serviceOrderId,
      materialId: material.id,
      quantityUsed: quantity,
      technicianId,
      consumptionType,
    });
    await queryRunner.manager.save(ServiceOrderMaterial, serviceOrderMaterial);

    // Determinar el tipo de movimiento según el tipo de consumo
    // Si es DAMAGED, crear movimiento de tipo DAMAGED (no CONSUMPTION)
    const movementType =
      consumptionType === ConsumptionType.DAMAGED
        ? MovementType.DAMAGED
        : MovementType.CONSUMPTION;

    // Crear movimiento
    const movement = queryRunner.manager.create(InventoryMovement, {
      materialId: material.id,
      fromLocationId: location.id,
      toLocationId: null,
      quantity,
      type: movementType,
      serviceOrderId,
      technicianId,
    });
    await queryRunner.manager.save(InventoryMovement, movement);
  }

  /**
   * Consulta el inventario de una bodega
   * 
   * Retorna todos los materiales con su stock actual en la bodega.
   */
  async getWarehouseInventory(): Promise<WarehouseInventoryDto[]> {
    // Obtener la bodega central
    const warehouse = await this.locationRepository.findOne({
      where: { type: LocationType.WAREHOUSE },
    });

    if (!warehouse) {
      this.logger.warn('No se encontró bodega central');
      return [];
    }

    return this.getInventoryByLocation(warehouse.id);
  }

  /**
   * Consulta el inventario de un técnico
   */
  async getTechnicianInventory(technicianLocationId: string): Promise<WarehouseInventoryDto[]> {
    return this.getInventoryByLocation(technicianLocationId);
  }

  /**
   * Obtiene inventario con filtros opcionales
   * 
   * @param type - Tipo de ubicación (WAREHOUSE, TECHNICIAN) o undefined para todas
   * @param locationId - ID de ubicación específica (opcional)
   * @param category - Categoría del material (opcional)
   * @param stockStatus - Estado del stock: 'low', 'normal', 'out_of_stock' (opcional)
   * @param search - Búsqueda por nombre de material (opcional)
   * @returns Lista de inventarios filtrados
   */
  async getInventory(
    type?: 'warehouse' | 'technician',
    locationId?: string,
    category?: string,
    stockStatus?: 'low' | 'normal' | 'out_of_stock',
    search?: string,
  ): Promise<WarehouseInventoryDto[]> {
    let allInventories: WarehouseInventoryDto[] = [];

    // Obtener inventarios según los filtros de ubicación
    if (locationId) {
      allInventories = await this.getInventoryByLocation(locationId);
    } else if (type === 'warehouse') {
      allInventories = await this.getWarehouseInventory();
    } else if (type === 'technician') {
      const technicianLocations = await this.locationRepository.find({
        where: { type: LocationType.TECHNICIAN },
      });

      if (technicianLocations.length === 0) {
        return [];
      }

      for (const location of technicianLocations) {
        const inventories = await this.getInventoryByLocation(location.id);
        allInventories.push(...inventories);
      }
    } else {
      // Todas las ubicaciones
      const allLocations = await this.locationRepository.find();
      for (const location of allLocations) {
        const inventories = await this.getInventoryByLocation(location.id);
        allInventories.push(...inventories);
      }
    }

    // Aplicar filtros adicionales
    let filteredInventories = allInventories;

    // Filtro por categoría
    if (category && category.trim().length > 0) {
      filteredInventories = filteredInventories.filter(
        (inv) => inv.materialCategory?.toLowerCase() === category.trim().toLowerCase(),
      );
    }

    // Filtro por búsqueda (nombre de material)
    if (search && search.trim().length > 0) {
      const searchTerm = search.trim().toLowerCase();
      filteredInventories = filteredInventories.filter((inv) =>
        inv.materialName?.toLowerCase().includes(searchTerm),
      );
    }

    // Filtro por estado del stock
    if (stockStatus) {
      filteredInventories = filteredInventories.filter((inv) => {
        const stock = inv.stock;
        const minStock = inv.minStock;

        switch (stockStatus) {
          case 'out_of_stock':
            return stock === 0;

          case 'low':
            // Solo aplica para bodega (minStock no es null)
            return minStock !== null && minStock !== undefined && stock < minStock;

          case 'normal':
            // Stock normal: >= minStock (si tiene minStock) o cualquier stock > 0 (si no tiene minStock)
            if (minStock !== null && minStock !== undefined) {
              return stock >= minStock;
            }
            return stock > 0;

          default:
            return true;
        }
      });
    }

    return filteredInventories;
  }

  /**
   * Método genérico para obtener inventario de una ubicación
   * Hace joins con material y location, y obtiene la última actualización del último movimiento
   */
  private async getInventoryByLocation(locationId: string): Promise<WarehouseInventoryDto[]> {
    // Obtener todos los inventarios con información del material y location
    const inventories = await this.inventoryRepository.find({
      where: { locationId },
      relations: ['material', 'location'],
    });

    // Si no hay inventarios, retornar array vacío
    if (inventories.length === 0) {
      return [];
    }

    // Obtener los últimos movimientos para cada material en esta ubicación (para lastUpdated)
    // Buscamos movimientos donde la ubicación sea origen O destino
    const materialIds = inventories.map((inv) => inv.materialId);
    
    // Solo hacer la consulta de movimientos si hay materiales
    let lastMovements: any[] = [];
    if (materialIds.length > 0) {
      lastMovements = await this.movementRepository
        .createQueryBuilder('movement')
        .select('movement.materialId', 'materialId')
        .addSelect('MAX(movement.createdAt)', 'lastUpdated')
        .where('movement.materialId IN (:...materialIds)', { materialIds })
        .andWhere('(movement.fromLocationId = :locationId OR movement.toLocationId = :locationId)', {
          locationId,
        })
        .groupBy('movement.materialId')
        .getRawMany();
    }

    // Crear un mapa para buscar rápidamente la última actualización por materialId
    const lastUpdatedMap = new Map<string, Date>();
    lastMovements.forEach((movement) => {
      const materialId = movement.materialId;
      const lastUpdated = movement.lastUpdated ? new Date(movement.lastUpdated) : null;
      if (lastUpdated) {
        lastUpdatedMap.set(materialId, lastUpdated);
      }
    });

    return inventories.map((inv) => ({
      materialId: inv.materialId,
      materialName: inv.material.name,
      materialCategory: inv.material.category,
      materialImages: inv.material.images || null,
      unit: inv.material.unit,
      stock: Number(inv.stock),
      minStock: inv.minStock !== null && inv.minStock !== undefined ? Number(inv.minStock) : null,
      locationId: inv.locationId,
      locationName: inv.location.name,
      locationType: inv.location.type,
      locationReferenceId: inv.location.referenceId,
      lastUpdated: lastUpdatedMap.get(inv.materialId) || null,
    }));
  }

  /**
   * Obtiene o crea la ubicación de un técnico
   */
  async getOrCreateTechnicianLocation(technicianId: string, technicianName: string): Promise<Location> {
    let location = await this.locationRepository.findOne({
      where: {
        type: LocationType.TECHNICIAN,
        referenceId: technicianId,
      },
    });

    if (!location) {
      location = this.locationRepository.create({
        type: LocationType.TECHNICIAN,
        referenceId: technicianId,
        name: `Inventario de ${technicianName}`,
      });
      location = await this.locationRepository.save(location);
      this.logger.log(`Ubicación creada para técnico ${technicianId}`);
    }

    return location;
  }

  /**
   * Obtiene o crea la bodega central
   */
  async getOrCreateWarehouse(): Promise<Location> {
    let warehouse = await this.locationRepository.findOne({
      where: { type: LocationType.WAREHOUSE },
    });

    if (!warehouse) {
      warehouse = this.locationRepository.create({
        type: LocationType.WAREHOUSE,
        referenceId: null,
        name: 'Bodega Central',
      });
      warehouse = await this.locationRepository.save(warehouse);
      this.logger.log('Bodega central creada');
    }

    return warehouse;
  }

  /**
   * Crea un nuevo material
   */
  async createMaterial(
    name: string,
    unit: string,
    minStock: number = 0,
    category: string = 'GENERAL',
    images?: string[],
  ): Promise<Material> {
    const material = this.materialRepository.create({
      name,
      unit,
      minStock,
      category,
      images: images || null,
    });
    const saved = await this.materialRepository.save(material);
    this.logger.log(`Material creado: ${saved.name} (${saved.id})`);
    return saved;
  }

  /**
   * Lista todos los materiales
   */
  async getAllMaterials(): Promise<Material[]> {
    return this.materialRepository.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Lista materiales con paginación y búsqueda opcional
   */
  async getMaterialsPaginated(
    page = 1,
    perPage = 20,
    search?: string,
  ): Promise<{ items: Material[]; total: number }> {
    const qb = this.materialRepository
      .createQueryBuilder('m')
      .orderBy('m.name', 'ASC')
      .skip((page - 1) * perPage)
      .take(perPage);

    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      // Buscar por nombre o categoría
      qb.where('m.name LIKE :term OR m.category LIKE :term', { term });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * Obtiene un material por ID
   */
  async getMaterialById(id: string): Promise<Material | null> {
    return this.materialRepository.findOne({
      where: { id },
    });
  }

  /**
   * Crea una nueva ubicación
   */
  async createLocation(
    type: LocationType,
    name: string,
    referenceId?: string,
  ): Promise<Location> {
    // Validar que no exista otra bodega si se está creando una bodega
    if (type === LocationType.WAREHOUSE) {
      const existingWarehouse = await this.locationRepository.findOne({
        where: { type: LocationType.WAREHOUSE },
      });
      if (existingWarehouse) {
        throw new BadRequestException('Ya existe una bodega central. Solo puede haber una bodega.');
      }
    }

    // Validar que no exista otra ubicación de tipo TECHNICIAN con el mismo referenceId
    if (type === LocationType.TECHNICIAN) {
      if (!referenceId) {
        throw new BadRequestException('El referenceId es obligatorio para ubicaciones de tipo TECHNICIAN.');
      }

      const existingTechnicianLocation = await this.locationRepository.findOne({
        where: {
          type: LocationType.TECHNICIAN,
          referenceId: referenceId,
        },
      });

      if (existingTechnicianLocation) {
        throw new ConflictException(
          `Ya existe una ubicación de tipo técnico con el referenceId "${referenceId}".`,
        );
      }
    }

    const location = this.locationRepository.create({
      type,
      name,
      referenceId: referenceId || null,
    });
    const saved = await this.locationRepository.save(location);
    this.logger.log(`Ubicación creada: ${saved.name} (${saved.id})`);
    return saved;
  }

  /**
   * Elimina una ubicación
   * 
   * IMPORTANTE: Al eliminar una ubicación:
   * - Se eliminarán automáticamente todos los registros de Inventory asociados (CASCADE)
   * - Los registros de InventoryMovement que referencian esta ubicación tendrán
   *   sus campos fromLocationId/toLocationId puestos en NULL (SET NULL)
   * 
   * No se puede eliminar una ubicación que tenga stock (se valida antes de eliminar)
   */
  async deleteLocation(locationId: string): Promise<void> {
    const location = await this.locationRepository.findOne({
      where: { id: locationId },
      relations: ['inventories'],
    });

    if (!location) {
      throw new NotFoundException(`Ubicación con ID "${locationId}" no encontrada.`);
    }

    // Verificar si tiene stock
    const hasStock = location.inventories?.some((inv) => Number(inv.stock) > 0);
    if (hasStock) {
      throw new BadRequestException(
        `No se puede eliminar la ubicación "${location.name}" porque tiene stock. Transfiere o ajusta el inventario antes de eliminar.`,
      );
    }

    // Verificar si es la bodega central (opcional: podría no permitirse eliminar)
    if (location.type === LocationType.WAREHOUSE) {
      this.logger.warn(`Eliminando bodega central: ${location.name}`);
    }

    await this.locationRepository.remove(location);
    this.logger.log(`Ubicación eliminada: ${location.name} (${location.id})`);
  }

  /**
   * Obtiene estadísticas del inventario
   * 
   * @returns Estadísticas: total de materiales, total de ubicaciones, cantidad de stocks bajos, y materiales sin stock en bodega
   */
  async getInventoryStats(): Promise<{
    totalMaterials: number;
    totalLocations: number;
    lowStockCount: number;
    warehouseOutOfStockCount: number;
  }> {
    // Total de materiales
    const totalMaterials = await this.materialRepository.count();

    // Total de ubicaciones
    const totalLocations = await this.locationRepository.count();

    // Contar inventarios con stock por debajo del mínimo
    // Solo cuenta inventarios donde minStock no es null (bodega) y stock < minStock
    const lowStockInventories = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .innerJoin('inventory.location', 'location')
      .where('inventory.minStock IS NOT NULL')
      .andWhere('inventory.stock < inventory.minStock')
      .andWhere('location.type = :warehouseType', { warehouseType: LocationType.WAREHOUSE })
      .getCount();

    // Contar materiales sin stock en bodega
    // Buscar la bodega central
    const warehouse = await this.locationRepository.findOne({
      where: { type: LocationType.WAREHOUSE },
    });

    let warehouseOutOfStockCount = 0;
    if (warehouse) {
      warehouseOutOfStockCount = await this.inventoryRepository
        .createQueryBuilder('inventory')
        .where('inventory.locationId = :warehouseId', { warehouseId: warehouse.id })
        .andWhere('inventory.stock = 0')
        .getCount();
    }

    return {
      totalMaterials,
      totalLocations,
      lowStockCount: lowStockInventories,
      warehouseOutOfStockCount,
    };
  }

  /**
   * Lista todas las ubicaciones
   * 
   * @param type - Filtro opcional por tipo de ubicación
   * @param active - Filtro opcional por estado activo/inactivo
   * @returns Lista de ubicaciones filtradas
   */
  async getAllLocations(type?: LocationType, active?: boolean | string): Promise<Location[]> {
    const where: any = {};

    if (type !== undefined) {
      where.type = type;
    }

    if (active !== undefined) {
      // Asegurarse de convertir string a boolean si es necesario
      if (typeof active === 'string') {
        where.active = active === 'true' || active === '1';
      } else {
        where.active = active === true;
      }
    }

    this.logger.debug(`getAllLocations - type: ${type}, active: ${active} (${typeof active}), where: ${JSON.stringify(where)}`);

    const locations = await this.locationRepository.find({
      where,
      order: { type: 'ASC', name: 'ASC' },
    });

    this.logger.debug(`getAllLocations - encontradas ${locations.length} ubicaciones`);

    return locations;
  }

  /**
   * Obtiene una ubicación por ID
   */
  async getLocationById(id: string): Promise<Location | null> {
    return this.locationRepository.findOne({
      where: { id },
    });
  }

  /**
   * Ajusta el inventario (agrega o quita stock)
   * 
   * Útil para:
   * - Agregar stock inicial a la bodega
   * - Hacer correcciones de inventario
   * - Ajustes manuales
   * 
   * Crea un movimiento de tipo ADJUSTMENT.
   */
  async adjustInventory(
    materialId: string,
    locationId: string,
    quantity: number,
  ): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validar material
      const material = await queryRunner.manager.findOne(Material, {
        where: { id: materialId },
      });
      if (!material) {
        throw new NotFoundException(`Material con ID ${materialId} no encontrado`);
      }

      // Validar ubicación
      const location = await queryRunner.manager.findOne(Location, {
        where: { id: locationId },
      });
      if (!location) {
        throw new NotFoundException(`Ubicación con ID ${locationId} no encontrada`);
      }

      // Obtener o crear inventario
      let inventory = await queryRunner.manager.findOne(Inventory, {
        where: {
          materialId,
          locationId,
        },
      });

      if (!inventory) {
        // Determinar minStock según el tipo de ubicación
        const minStock = location.type === LocationType.WAREHOUSE ? material.minStock : null;
        
        inventory = queryRunner.manager.create(Inventory, {
          materialId,
          locationId,
          stock: 0,
          minStock, // Bodega: copiar del material, Técnico: null
        });
      }

      // Ajustar stock (puede ser positivo o negativo)
      const newStock = Number(inventory.stock) + quantity;
      if (newStock < 0) {
        throw new BadRequestException(
          `No se puede ajustar el inventario. Stock actual: ${inventory.stock}, Ajuste: ${quantity}. Resultado sería negativo.`,
        );
      }

      inventory.stock = newStock;
      await queryRunner.manager.save(Inventory, inventory);

      // Crear movimiento de tipo ADJUSTMENT
      const movement = queryRunner.manager.create(InventoryMovement, {
        materialId,
        fromLocationId: locationId, // Para ajustes, la ubicación es tanto origen como destino
        toLocationId: locationId,
        quantity: Math.abs(quantity), // Guardamos la cantidad absoluta
        type: MovementType.ADJUSTMENT,
      });
      await queryRunner.manager.save(InventoryMovement, movement);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Inventario ajustado: ${material.name} en ${location.name}. Ajuste: ${quantity > 0 ? '+' : ''}${quantity}. Nuevo stock: ${newStock}`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Error al ajustar inventario: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Obtiene el historial de movimientos de inventario con información completa
   * 
   * Incluye:
   * - Nombre, categoría y unidad del material
   * - Nombres de las ubicaciones de origen y destino
   * 
   * Soporta paginación y filtros opcionales.
   */
  async getMovements(
    page: number = 1,
    perPage: number = 20,
    materialId?: string,
    locationId?: string,
    fromLocationId?: string,
    toLocationId?: string,
    technicianId?: string,
    type?: MovementType,
    fromDate?: string,
    toDate?: string,
  ): Promise<{ movements: any[]; total: number }> {
    const skip = (page - 1) * perPage;

    const queryBuilder = this.movementRepository
      .createQueryBuilder('movement')
      .leftJoinAndSelect('movement.material', 'material')
      .leftJoinAndSelect('movement.fromLocation', 'fromLocation')
      .leftJoinAndSelect('movement.toLocation', 'toLocation')
      .orderBy('movement.createdAt', 'DESC');

    // Debug: log de la query SQL generada
    this.logger.debug(`getMovements - Query SQL: ${queryBuilder.getSql()}`);

    // Filtros opcionales
    if (materialId) {
      queryBuilder.andWhere('movement.materialId = :materialId', { materialId });
    }

    // Filtro por location (origen o destino)
    if (locationId) {
      queryBuilder.andWhere(
        '(movement.fromLocationId = :locationId OR movement.toLocationId = :locationId)',
        { locationId },
      );
    }

    // Filtro específico por location de origen
    if (fromLocationId) {
      queryBuilder.andWhere('movement.fromLocationId = :fromLocationId', { fromLocationId });
    }

    // Filtro específico por location de destino
    // NOTA: Los movimientos CONSUMPTION tienen toLocationId = null, así que este filtro los excluirá
    if (toLocationId) {
      queryBuilder.andWhere('movement.toLocationId = :toLocationId', { toLocationId });
    }

    if (technicianId) {
      queryBuilder.andWhere('movement.technicianId = :technicianId', { technicianId });
    }

    if (type) {
      queryBuilder.andWhere('movement.type = :type', { type });
    }

    // Filtros de fecha
    if (fromDate) {
      // Si solo viene la fecha (YYYY-MM-DD), establecer inicio del día
      const fromDateObj = new Date(fromDate);
      if (fromDate.length === 10) {
        // Solo fecha, sin hora
        fromDateObj.setHours(0, 0, 0, 0);
      }
      queryBuilder.andWhere('movement.createdAt >= :fromDate', { fromDate: fromDateObj });
    }

    if (toDate) {
      // Si solo viene la fecha (YYYY-MM-DD), establecer fin del día
      const toDateObj = new Date(toDate);
      if (toDate.length === 10) {
        // Solo fecha, sin hora
        toDateObj.setHours(23, 59, 59, 999);
      }
      queryBuilder.andWhere('movement.createdAt <= :toDate', { toDate: toDateObj });
    }

    // Obtener total antes de aplicar paginación
    const total = await queryBuilder.getCount();

    // Aplicar paginación
    const movements = await queryBuilder.skip(skip).take(perPage).getMany();

    // Debug: verificar qué movimientos se están obteniendo
    const consumptionCount = movements.filter((m) => m.type === MovementType.CONSUMPTION).length;
    const damagedCount = movements.filter((m) => m.type === MovementType.DAMAGED).length;
    this.logger.debug(
      `getMovements - Total: ${total}, Obtenidos: ${movements.length}, CONSUMPTION: ${consumptionCount}, DAMAGED: ${damagedCount}, Tipos: ${movements.map((m) => m.type).join(', ')}`,
    );

    // Obtener consumptionType para movimientos de tipo CONSUMPTION
    // Hacer consulta separada para obtener los ServiceOrderMaterials y hacer coincidencia por cantidad
    const consumptionMovements = movements.filter(
      (m) => m.type === MovementType.CONSUMPTION && m.serviceOrderId && m.technicianId,
    );

    let consumptionTypeMap: Map<string, ConsumptionType> = new Map();
    let serviceOrderMaterials: ServiceOrderMaterial[] = [];

    if (consumptionMovements.length > 0) {
      // Obtener todos los ServiceOrderMaterials relevantes
      const serviceOrderIds = [...new Set(consumptionMovements.map((m) => m.serviceOrderId!))];
      const technicianIds = [...new Set(consumptionMovements.map((m) => m.technicianId!))];
      const materialIds = [...new Set(consumptionMovements.map((m) => m.materialId))];

      serviceOrderMaterials = await this.dataSource
        .getRepository(ServiceOrderMaterial)
        .createQueryBuilder('som')
        .where('som.serviceOrderId IN (:...serviceOrderIds)', { serviceOrderIds })
        .andWhere('som.technicianId IN (:...technicianIds)', { technicianIds })
        .andWhere('som.materialId IN (:...materialIds)', { materialIds })
        .getMany();

      // Crear mapa: key = "serviceOrderId|technicianId|materialId|quantity", value = consumptionType
      // Usamos la cantidad para distinguir entre USED y DAMAGED del mismo material
      for (const som of serviceOrderMaterials) {
        const key = `${som.serviceOrderId}|${som.technicianId}|${som.materialId}|${Number(som.quantityUsed).toFixed(2)}`;
        consumptionTypeMap.set(key, som.consumptionType);
      }
    }

    // Mapear a formato con información completa
    const movementsWithDetails = movements.map((movement) => {
      let consumptionType: ConsumptionType | undefined = undefined;

      if (movement.type === MovementType.CONSUMPTION && movement.serviceOrderId && movement.technicianId) {
        // Buscar en el mapa usando la cantidad para hacer coincidencia exacta
        const key = `${movement.serviceOrderId}|${movement.technicianId}|${movement.materialId}|${Number(movement.quantity).toFixed(2)}`;
        consumptionType = consumptionTypeMap.get(key);
        
        // Si no se encontró con cantidad exacta, buscar en los ServiceOrderMaterials por coincidencia de cantidad
        if (!consumptionType) {
          // Buscar en la lista de ServiceOrderMaterials ya obtenida
          const matchingSOM = serviceOrderMaterials.find(
            (som) =>
              som.serviceOrderId === movement.serviceOrderId &&
              som.technicianId === movement.technicianId &&
              som.materialId === movement.materialId &&
              Math.abs(Number(som.quantityUsed) - Number(movement.quantity)) < 0.01,
          );
          
          if (matchingSOM) {
            consumptionType = matchingSOM.consumptionType;
          }
        }
      }

      return {
        id: movement.id,
        materialId: movement.materialId,
        materialName: movement.material?.name || 'Material eliminado',
        materialCategory: movement.material?.category || 'N/A',
        materialUnit: movement.material?.unit || 'N/A',
        fromLocationId: movement.fromLocationId,
        fromLocationName: movement.fromLocation?.name || null,
        toLocationId: movement.toLocationId,
        toLocationName: movement.toLocation?.name || null,
        quantity: Number(movement.quantity),
        type: movement.type,
        serviceOrderId: movement.serviceOrderId,
        technicianId: movement.technicianId,
        consumptionType,
        createdAt: movement.createdAt,
      };
    });

    return {
      movements: movementsWithDetails,
      total,
    };
  }

  /**
   * Obtiene estadísticas de movimientos por período
   * 
   * Devuelve:
   * - today: Movimientos del día actual (desde inicio del día hasta fin del día)
   * - thisWeek: Movimientos de esta semana (desde lunes hasta domingo)
   * - thisMonth: Movimientos del mes actual (desde día 1 hasta último día del mes)
   */
  async getMovementsStats(): Promise<{ today: number; thisWeek: number; thisMonth: number }> {
    const now = new Date();

    // HOY: Inicio y fin del día actual
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    todayEnd.setHours(23, 59, 59, 999);

    // ESTA SEMANA: Lunes a domingo
    const dayOfWeek = now.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Ajuste: domingo = 6 días desde lunes
    
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromMonday);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Domingo de esta semana
    weekEnd.setHours(23, 59, 59, 999);

    // ESTE MES: Día 1 hasta último día del mes
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Último día del mes
    monthEnd.setHours(23, 59, 59, 999);

    // Contar movimientos de hoy
    const todayCount = await this.movementRepository
      .createQueryBuilder('movement')
      .where('movement.createdAt >= :todayStart', { todayStart })
      .andWhere('movement.createdAt <= :todayEnd', { todayEnd })
      .getCount();

    // Contar movimientos de esta semana
    const weekCount = await this.movementRepository
      .createQueryBuilder('movement')
      .where('movement.createdAt >= :weekStart', { weekStart })
      .andWhere('movement.createdAt <= :weekEnd', { weekEnd })
      .getCount();

    // Contar movimientos de este mes
    const monthCount = await this.movementRepository
      .createQueryBuilder('movement')
      .where('movement.createdAt >= :monthStart', { monthStart })
      .andWhere('movement.createdAt <= :monthEnd', { monthEnd })
      .getCount();

    return {
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
    };
  }
}

