/**
 * Inventory Controller
 * 
 * Controlador que expone los endpoints relacionados con inventario.
 */
import { Controller, Post, Get, Delete, Body, Param, HttpCode, HttpStatus, Query, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { InventoryService } from '@application/services/inventory';
import { UploadImageUseCase } from '@application/use-cases/upload-image.use-case';
import {
  TransferMaterialRequestDto,
  ConsumeMaterialRequestDto,
  ConsumeMaterialsRequestDto,
  CreateMaterialRequestDto,
  CreateLocationRequestDto,
  AdjustInventoryRequestDto,
  GetMaterialsRequestDto,
  GetInventoryRequestDto,
  GetMovementsRequestDto,
  GetLocationsRequestDto,
} from '@presentation/dto';
import { JwtAuthGuard } from '@presentation/guards';
import { CurrentUser } from '@presentation/decorators';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { GetCurrentUserUseCase } from '@application/use-cases';
import { InventoryResponseDto } from '@presentation/dto/responses/inventory-response.dto';
import { InventoryStatsResponseDto } from '@presentation/dto/responses/inventory-stats-response.dto';
import { GetMovementsResponseDto } from '@presentation/dto/responses/inventory-movement.dto';
import { MovementsStatsResponseDto } from '@presentation/dto/responses/movements-stats-response.dto';
import { MaterialDto, LocationDto, GetMaterialsResponseDto } from '@presentation/dto';
import { BadRequestException } from '@nestjs/common';

@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly uploadImageUseCase: UploadImageUseCase,
  ) {}

  /**
   * Transfiere material entre ubicaciones (bodega, técnico, cuadrilla)
   * 
   * POST /inventory/transfer
   * 
   * Permite transferir material entre cualquier tipo de ubicación:
   * - Bodega → Técnico
   * - Bodega → Cuadrilla
   * - Técnico → Bodega
   * - Técnico → Cuadrilla
   * - Cuadrilla → Bodega
   * 
   * Body:
   * - materialId: UUID del material
   * - fromLocationId: UUID de la ubicación origen
   * - toLocationId: UUID de la ubicación destino
   * - quantity: Cantidad total a transferir
   * - damagedQuantity: (Opcional) Cantidad de material que se dañó durante la transferencia
   *   - Si se especifica, se creará un movimiento DAMAGED para esa cantidad
   *   - Solo la cantidad restante (quantity - damagedQuantity) llegará al destino
   * - technicianId: (Opcional) ID del técnico que realiza la transferencia
   * 
   * Ejemplo:
   * - quantity: 10, damagedQuantity: 2
   * - Resultado: 8 unidades llegan al destino, 2 se registran como dañadas
   */
  @Post('transfer')
  @HttpCode(HttpStatus.NO_CONTENT)
  async transferMaterial(@Body() dto: TransferMaterialRequestDto): Promise<void> {
    return this.inventoryService.transferMaterialToTechnician(dto);
  }

  /**
   * Registra consumo de material en una orden de servicio
   * 
   * POST /inventory/consume
   */
  /**
   * Registra el consumo de material en una orden de servicio
   * 
   * POST /inventory/consume
   * 
   * Registra que un técnico consumió material de su inventario en una orden.
   * El material se resta del inventario del técnico (NO de la bodega).
   * 
   * NOTA: technicianLocationId es opcional. Si no se proporciona, se buscará
   * automáticamente la Location del técnico usando technicianId.
   * 
   * @param dto - Datos del consumo (materialId, technicianLocationId?, quantity, serviceOrderId, technicianId, consumptionType?)
   * @returns void
   */
  @Post('consume')
  @HttpCode(HttpStatus.NO_CONTENT)
  async consumeMaterial(@Body() dto: ConsumeMaterialRequestDto): Promise<void> {
    return this.inventoryService.consumeMaterialInOrder({
      materialId: dto.materialId,
      technicianLocationId: dto.technicianLocationId,
      quantity: dto.quantity,
      serviceOrderId: dto.serviceOrderId,
      technicianId: dto.technicianId,
      consumptionType: dto.consumptionType,
    });
  }

  /**
   * Registra el consumo de múltiples materiales en una orden de servicio
   * 
   * POST /inventory/consume-materials
   * 
   * Registra el consumo de múltiples materiales en una orden de servicio.
   * El consumo se asocia automáticamente al usuario/cuadrilla del JWT según el ownershipType de cada material.
   * 
   * - Si el material es de tipo TECHNICIAN: se consume del inventario del técnico
   * - Si el material es de tipo CREW: se consume del inventario de la cuadrilla del técnico
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * El technicianId se obtiene automáticamente del JWT llamando a /users/current de Wispro
   * 
   * @param dto - Datos del consumo (materials[], serviceOrderId)
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns void
   */
  @Post('consume-materials')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async consumeMaterials(
    @Body() dto: ConsumeMaterialsRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    // Obtener technicianId del JWT llamando a Wispro
    const currentUser = await this.getCurrentUserUseCase.execute(user);
    const technicianId = currentUser.userable_id; // userable_id es el ID del empleado (technicianId)

    // Preparar los materiales para el servicio
    const materials = dto.materials.map((m) => ({
      materialId: m.materialId,
      quantityUsed: m.quantityUsed || 0,
      quantityDamaged: m.quantityDamaged || 0,
    }));

    // Llamar al servicio para procesar el consumo
    return this.inventoryService.consumeMaterialsInOrder(
      materials,
      dto.serviceOrderId,
      technicianId,
    );
  }

  /**
   * Consulta el inventario con filtros opcionales
   * 
   * GET /inventory
   * GET /inventory?type=warehouse
   * GET /inventory?type=technician
   * GET /inventory?locationId={uuid}
   * GET /inventory?category=CABLEADO
   * GET /inventory?stockStatus=low
   * GET /inventory?search=cable
   * 
   * Filtros disponibles:
   * - type: 'warehouse' | 'technician'
   * - locationId: UUID de ubicación específica
   * - category: Categoría del material
   * - stockStatus: 'low' | 'normal' | 'out_of_stock'
   * - search: Búsqueda por nombre de material
   * 
   * Si no se especifica ningún filtro, devuelve todos los inventarios de todas las ubicaciones.
   */
  @Get()
  async getInventory(@Query() query: GetInventoryRequestDto): Promise<InventoryResponseDto> {
    const items = await this.inventoryService.getInventory(
      query.type,
      query.locationId,
      query.category,
      query.stockStatus,
      query.search,
    );
    return { items };
  }

  /**
   * Consulta el inventario de la bodega central
   * 
   * GET /inventory/warehouse
   * @deprecated Usar GET /inventory?type=warehouse en su lugar
   */
  @Get('warehouse')
  async getWarehouseInventory(): Promise<InventoryResponseDto> {
    const items = await this.inventoryService.getWarehouseInventory();
    return { items };
  }

  /**
   * Consulta el inventario de un técnico
   * 
   * GET /inventory/technician/:locationId
   * @deprecated Usar GET /inventory?locationId={locationId} en su lugar
   */
  @Get('technician/:locationId')
  async getTechnicianInventory(@Param('locationId') locationId: string): Promise<InventoryResponseDto> {
    const items = await this.inventoryService.getTechnicianInventory(locationId);
    return { items };
  }

  /**
   * Crea un nuevo material
   * 
   * POST /inventory/materials
   * 
   * Acepta un formulario multipart con:
   * - name: string (requerido)
   * - unit: string (requerido)
   * - minStock: number (opcional, default: 0)
   * - category: string (opcional, default: 'GENERAL')
   * - ownershipType: 'TECHNICIAN' | 'CREW' (opcional, default: 'TECHNICIAN')
   * - images: File[] (opcional, múltiples archivos)
   * 
   * Las imágenes se suben a Google Cloud Storage y se guardan las URLs en el material.
   */
  @Post('materials')
  @UseInterceptors(FilesInterceptor('images', 10)) // Máximo 10 imágenes
  @HttpCode(HttpStatus.CREATED)
  async createMaterial(
    @Body() dto: CreateMaterialRequestDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ): Promise<MaterialDto> {
    // Subir imágenes a GCS si se proporcionaron
    let imageUrls: string[] = [];
    
    if (files && files.length > 0) {
      try {
        // Subir todas las imágenes en paralelo
        const uploadPromises = files.map((file) =>
          this.uploadImageUseCase.execute({
            buffer: file.buffer,
            originalName: file.originalname,
            mimeType: file.mimetype,
          }),
        );
        
        imageUrls = await Promise.all(uploadPromises);
      } catch (error) {
        throw new BadRequestException(
          `Error al subir imágenes: ${error?.message || 'Error desconocido'}`,
        );
      }
    }

    // Si se proporcionaron URLs en el DTO, combinarlas con las subidas
    const allImageUrls = [...imageUrls, ...(dto.images || [])];

    const material = await this.inventoryService.createMaterial(
      dto.name,
      dto.unit,
      dto.minStock,
      dto.category,
      allImageUrls.length > 0 ? allImageUrls : undefined,
    );
    
    return {
      id: material.id,
      name: material.name,
      unit: material.unit,
      minStock: Number(material.minStock ?? 0),
      category: material.category,
      images: (material as any).images ?? null,
      ownershipType: (material as any).ownershipType || 'TECHNICIAN',
      createdAt: material.createdAt,
    };
  }

  /**
   * Lista materiales con paginación
   * 
   * GET /inventory/materials
   */
  @Get('materials')
  async getAllMaterials(
    @Query() query: GetMaterialsRequestDto,
  ): Promise<GetMaterialsResponseDto> {
    const perPage = query.per_page || 20;
    const page = query.page || 1;
    const search = query.search?.trim() || undefined;

    const { items, total } = await this.inventoryService.getMaterialsPaginated(page, perPage, search);

    const materials: MaterialDto[] = items.map((m) => ({
      id: m.id,
      name: m.name,
      unit: m.unit,
      minStock: Number(m.minStock ?? 0),
      category: m.category,
      images: (m as any).images ?? null,
      ownershipType: (m as any).ownershipType || 'TECHNICIAN',
      createdAt: m.createdAt,
    }));

    const totalPages = Math.ceil(total / perPage) || 1;

    return {
      materials,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
      },
    };
  }

  /**
   * Crea una nueva ubicación
   * 
   * POST /inventory/locations
   */
  @Post('locations')
  @HttpCode(HttpStatus.CREATED)
  async createLocation(@Body() dto: CreateLocationRequestDto): Promise<LocationDto> {
    const location = await this.inventoryService.createLocation(
      dto.type,
      dto.name,
      dto.referenceId,
    );
    return {
      id: location.id,
      type: location.type,
      referenceId: location.referenceId,
      name: location.name,
      active: location.active,
      createdAt: location.createdAt,
    };
  }

  /**
   * Lista todas las ubicaciones
   * 
   * GET /inventory/locations
   * 
   * Query parameters:
   * - type (enum, opcional): Filtrar por tipo de ubicación
   *   - WAREHOUSE: solo bodegas
   *   - TECHNICIAN: solo ubicaciones de técnicos
   *   - CREW: solo ubicaciones de cuadrillas
   *   - sin parámetro: todos los tipos
   * - active (boolean, opcional): Filtrar por estado activo/inactivo
   *   - true: solo ubicaciones activas
   *   - false: solo ubicaciones inactivas
   *   - sin parámetro: todas las ubicaciones
   */
  @Get('locations')
  async getAllLocations(@Query() query: GetLocationsRequestDto): Promise<LocationDto[]> {
    const locations = await this.inventoryService.getAllLocations(query.type, query.active);
    return locations.map((l) => ({
      id: l.id,
      type: l.type,
      referenceId: l.referenceId,
      name: l.name,
      active: l.active,
      createdAt: l.createdAt,
    }));
  }

  /**
   * Elimina una ubicación
   * 
   * DELETE /inventory/locations/:locationId
   * 
   * IMPORTANTE: 
   * - No se puede eliminar una ubicación que tenga stock
   * - Al eliminar, se eliminarán automáticamente los registros de inventario asociados
   * - Los movimientos de inventario que referencian esta ubicación tendrán sus campos puestos en NULL
   */
  @Delete('locations/:locationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLocation(@Param('locationId') locationId: string): Promise<void> {
    return this.inventoryService.deleteLocation(locationId);
  }

  /**
   * Ajusta el inventario (agrega o quita stock)
   * 
   * Útil para agregar stock inicial a la bodega o hacer correcciones.
   * 
   * POST /inventory/adjust
   */
  @Post('adjust')
  @HttpCode(HttpStatus.NO_CONTENT)
  async adjustInventory(@Body() dto: AdjustInventoryRequestDto): Promise<void> {
    return this.inventoryService.adjustInventory(
      dto.materialId,
      dto.locationId,
      dto.quantity,
    );
  }

  /**
   * Obtiene estadísticas del inventario
   * 
   * GET /inventory/stats
   * 
   * Devuelve:
   * - Total de materiales registrados
   * - Total de ubicaciones (bodega + técnicos)
   * - Cantidad de stocks por debajo del mínimo
   */
  @Get('stats')
  async getInventoryStats(): Promise<InventoryStatsResponseDto> {
    return this.inventoryService.getInventoryStats();
  }

  /**
   * Obtiene el historial de movimientos de inventario
   * 
   * GET /inventory/movements
   * GET /inventory/movements?page=1&per_page=20
   * GET /inventory/movements?materialId={uuid}
   * GET /inventory/movements?locationId={uuid}
   * GET /inventory/movements?fromLocationId={uuid}
   * GET /inventory/movements?toLocationId={uuid}
   * GET /inventory/movements?technicianId={wispro-id}
   * GET /inventory/movements?type=TRANSFER
   * GET /inventory/movements?fromDate=2026-02-01&toDate=2026-02-28
   * 
   * Filtros disponibles:
   * - page: Número de página (default: 1)
   * - per_page: Elementos por página (default: 20)
   * - materialId: Filtrar por material específico
   * - locationId: Filtrar por ubicación (origen o destino)
   * - fromLocationId: Filtrar solo por ubicación de origen
   * - toLocationId: Filtrar solo por ubicación de destino
   * - technicianId: Filtrar por técnico
   * - type: Filtrar por tipo de movimiento (TRANSFER, CONSUMPTION, ADJUSTMENT)
   * - fromDate: Fecha de inicio (formato: YYYY-MM-DD o ISO 8601). Si solo se proporciona la fecha, se usa inicio del día (00:00:00)
   * - toDate: Fecha de fin (formato: YYYY-MM-DD o ISO 8601). Si solo se proporciona la fecha, se usa fin del día (23:59:59)
   * 
   * Devuelve información completa incluyendo:
   * - Nombre, categoría y unidad del material
   * - Nombres de las ubicaciones de origen y destino
   */
  @Get('movements')
  async getMovements(@Query() query: GetMovementsRequestDto): Promise<GetMovementsResponseDto> {
    const page = query.page || 1;
    const perPage = query.per_page || 20;

    // Debug: log de parámetros recibidos
    console.log('[InventoryController] getMovements - Query params:', {
      page,
      perPage,
      materialId: query.materialId,
      locationId: query.locationId,
      fromLocationId: query.fromLocationId,
      toLocationId: query.toLocationId,
      technicianId: query.technicianId,
      type: query.type,
      fromDate: query.fromDate,
      toDate: query.toDate,
    });

    const { movements, total } = await this.inventoryService.getMovements(
      page,
      perPage,
      query.materialId,
      query.locationId,
      query.fromLocationId,
      query.toLocationId,
      query.technicianId,
      query.type,
      query.fromDate,
      query.toDate,
    );

    const totalPages = Math.ceil(total / perPage) || 1;

    return {
      movements,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
      },
    };
  }

  /**
   * Obtiene estadísticas de movimientos por período
   * 
   * GET /inventory/movements/stats
   * 
   * Devuelve:
   * - today: Cantidad de movimientos del día actual (desde inicio del día hasta fin del día)
   * - thisWeek: Cantidad de movimientos de esta semana (desde lunes hasta domingo)
   * - thisMonth: Cantidad de movimientos del mes actual (desde día 1 hasta último día del mes)
   * 
   * IMPORTANTE:
   * - "Hoy" no son las últimas 24 horas, sino los movimientos del día calendario actual
   * - "Esta semana" no son los últimos 7 días, sino los movimientos de la semana actual (lunes a domingo)
   * - "Este mes" no son los últimos 30 días, sino los movimientos del mes calendario actual
   */
  @Get('movements/stats')
  async getMovementsStats(): Promise<MovementsStatsResponseDto> {
    return this.inventoryService.getMovementsStats();
  }
}

