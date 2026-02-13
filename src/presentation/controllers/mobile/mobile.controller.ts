/**
 * Mobile Controller
 * 
 * Controlador para los endpoints de la aplicación móvil.
 * Todos los endpoints están bajo el path /mobile/v1
 */
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MobileLoginUseCase, GetMobileOrdersUseCase, GetMobileOrderFeedbacksUseCase, GetMobileOrderImagesUseCase, UploadMobileOrderImagesUseCase, DeleteMobileOrderImageUseCase, CreateMobileOrderFeedbackUseCase, CreateMobileMaterialExpenseUseCase, GetMobileMaterialExpensesUseCase, FinalizeMobileOrderUseCase, RescheduleMobileOrderUseCase } from '@application/use-cases/mobile';
import {
  MobileLoginRequestDto,
  MobileLoginResponseDto,
  GetMobileOrdersRequestDto,
  CreateMobileOrderFeedbackRequestDto,
  FinalizeMobileOrderRequestDto,
  RescheduleMobileOrderRequestDto,
  GetOrderImagesResponseDto,
  GetMaterialsRequestDto,
  GetMaterialsResponseDto,
  CreateMaterialExpenseRequestDto,
  GetMobileMaterialExpensesResponseDto,
} from '@presentation/dto';
import { JwtAuthGuard } from '@presentation/guards';
import { CurrentUser } from '@presentation/decorators';
import { JwtPayload } from '@infrastructure/auth/jwt';
import { InventoryService } from '@application/services/inventory';

@Controller('mobile/v1')
export class MobileController {
  constructor(
    private readonly mobileLoginUseCase: MobileLoginUseCase,
    private readonly getMobileOrdersUseCase: GetMobileOrdersUseCase,
    private readonly getMobileOrderFeedbacksUseCase: GetMobileOrderFeedbacksUseCase,
    private readonly getMobileOrderImagesUseCase: GetMobileOrderImagesUseCase,
    private readonly uploadMobileOrderImagesUseCase: UploadMobileOrderImagesUseCase,
    private readonly deleteMobileOrderImageUseCase: DeleteMobileOrderImageUseCase,
    private readonly createMobileOrderFeedbackUseCase: CreateMobileOrderFeedbackUseCase,
    private readonly finalizeMobileOrderUseCase: FinalizeMobileOrderUseCase,
    private readonly rescheduleMobileOrderUseCase: RescheduleMobileOrderUseCase,
    private readonly inventoryService: InventoryService,
    private readonly createMobileMaterialExpenseUseCase: CreateMobileMaterialExpenseUseCase,
    private readonly getMobileMaterialExpensesUseCase: GetMobileMaterialExpensesUseCase,
  ) {}

  /**
   * Endpoint para login móvil
   * 
   * Valida credenciales internas y sincroniza con el login de Wispro mobile.
   * Si el usuario tiene credenciales de Wispro configuradas, intenta hacer
   * login a Wispro mobile y agrega la información al JWT.
   * 
   * @param dto - Datos de login (email y password)
   * @returns JWT token con información combinada de internal_user y Wispro mobile
   * 
   * @example
   * POST /mobile/v1/login
   * Content-Type: application/json
   * Body: {
   *   "email": "usuario@example.com",
   *   "password": "contraseña"
   * }
   * 
   * Response:
   * {
   *   "accessToken": "eyJhbGci...",
   *   "user": {
   *     "id": "...",
   *     "name": "...",
   *     "email": "..."
   *   },
   *   "wispro": {
   *     "token": "...",
   *     "user": {...},
   *     "isp": {...}
   *   }
   * }
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: MobileLoginRequestDto,
  ): Promise<MobileLoginResponseDto> {
    return this.mobileLoginUseCase.execute(dto.email, dto.password);
  }

  /**
   * Endpoint para obtener la lista de órdenes (móvil)
   * 
   * Obtiene la lista de órdenes desde la API móvil de Wispro
   * usando el token de autenticación móvil del JWT token.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * El token debe contener wisproMobile.token obtenido del login móvil.
   * 
   * @param query - Query parameters:
   *   - per_page: número de resultados por página (default: 1000)
   *   - page: número de página (default: 1)
   *   - start_at_gteq: filtrar órdenes con start_at >= fecha (formato: YYYY-MM-DD)
   *   - end_at_lteq: filtrar órdenes con end_at <= fecha (formato: YYYY-MM-DD)
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Respuesta de órdenes desde la API móvil de Wispro (sin transformar)
   * 
   * @example
   * GET /mobile/v1/orders?per_page=1000&page=1
   * GET /mobile/v1/orders?per_page=1000&page=1&start_at_gteq=2026-02-12&end_at_lteq=2026-02-13
   * Authorization: Bearer <jwt-token>
   */
  @Get('orders')
  @UseGuards(JwtAuthGuard)
  async getOrders(
    @Query() query: GetMobileOrdersRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    return this.getMobileOrdersUseCase.execute(query, user);
  }

  /**
   * Endpoint para obtener los feedbacks de una orden (móvil)
   * 
   * Obtiene los feedbacks de una orden desde la API móvil de Wispro
   * usando el token de autenticación móvil del JWT token.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * El token debe contener wisproMobile.token obtenido del login móvil.
   * 
   * @param orderId - ID de la orden
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Array de feedbacks desde la API móvil de Wispro (sin transformar)
   * 
   * @example
   * GET /mobile/v1/orders/bff84336-e781-4ce8-8e37-e6f8ca8ed635/feedbacks
   * Authorization: Bearer <jwt-token>
   */
  @Get('orders/:orderId/feedbacks')
  @UseGuards(JwtAuthGuard)
  async getOrderFeedbacks(
    @Param('orderId') orderId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    return this.getMobileOrderFeedbacksUseCase.execute(orderId, user);
  }

  /**
   * Endpoint para obtener las imágenes de una orden (móvil)
   * 
   * Obtiene las imágenes asociadas a una orden desde la API móvil de Wispro
   * usando el token de autenticación móvil del JWT token.
   * Separa las imágenes normales de las firmas (filename que empieza con 'sign-').
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * El token debe contener wisproMobile.token obtenido del login móvil.
   * 
   * @param orderId - ID de la orden
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Objeto con imágenes normales y firma separadas
   * 
   * @example
   * GET /mobile/v1/orders/bff84336-e781-4ce8-8e37-e6f8ca8ed635/images
   * Authorization: Bearer <jwt-token>
   * 
   * Response:
   * {
   *   "images": [...], // Imágenes normales
   *   "sign": {...} | null // Firma si existe
   * }
   */
  @Get('orders/:orderId/images')
  @UseGuards(JwtAuthGuard)
  async getOrderImages(
    @Param('orderId') orderId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<GetOrderImagesResponseDto> {
    return this.getMobileOrderImagesUseCase.execute(orderId, user);
  }

  /**
   * Endpoint para subir imágenes a una orden (móvil)
   * 
   * Sube imágenes a una orden desde la API móvil de Wispro
   * usando el token de autenticación móvil del JWT token.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * El token debe contener wisproMobile.token obtenido del login móvil.
   * 
   * @param orderId - ID de la orden
   * @param file - Archivo a subir (multipart/form-data)
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Array de imágenes desde la API móvil de Wispro (sin transformar)
   * 
   * @example
   * POST /mobile/v1/orders/bff84336-e781-4ce8-8e37-e6f8ca8ed635/upload_images
   * Authorization: Bearer <jwt-token>
   * Content-Type: multipart/form-data
   * Body: images[]=<archivo>
   */
  @Post('orders/:orderId/upload_images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('images[]'))
  @HttpCode(HttpStatus.OK)
  async uploadOrderImages(
    @Param('orderId') orderId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    if (!file) {
      throw new Error('No se proporcionó ningún archivo');
    }
    
    // Log para debug: ver qué está llegando del frontend
    console.log('File received from frontend:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      size: file.size,
      buffer_length: file.buffer?.length,
      has_buffer: !!file.buffer,
      has_stream: !!file.stream,
    });
    
    return this.uploadMobileOrderImagesUseCase.execute(orderId, file, user);
  }

  /**
   * Endpoint para eliminar una imagen de una orden (móvil)
   * 
   * Elimina una imagen de una orden desde la API móvil de Wispro
   * usando el token de autenticación móvil del JWT token.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * El token debe contener wisproMobile.token obtenido del login móvil.
   * 
   * @param orderId - ID de la orden
   * @param imageId - ID de la imagen a eliminar
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Respuesta de la API móvil de Wispro (generalmente vacía o mínima)
   * 
   * @example
   * DELETE /mobile/v1/orders/bff84336-e781-4ce8-8e37-e6f8ca8ed635/images/724b788b-7300-480d-9ace-1fb88dd121a6
   * Authorization: Bearer <jwt-token>
   */
  @Delete('orders/:orderId/images/:imageId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteOrderImage(
    @Param('orderId') orderId: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    return this.deleteMobileOrderImageUseCase.execute(orderId, imageId, user);
  }

  /**
   * Endpoint para crear un feedback en una orden (móvil)
   * 
   * Crea un feedback en una orden desde la API móvil de Wispro
   * usando el token de autenticación móvil del JWT token.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * El token debe contener wisproMobile.token obtenido del login móvil.
   * 
   * @param orderId - ID de la orden
   * @param dto - Datos del feedback (feedback.body)
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Objeto con el feedback creado desde la API móvil de Wispro (sin transformar)
   * 
   * @example
   * POST /mobile/v1/orders/bff84336-e781-4ce8-8e37-e6f8ca8ed635/feedbacks
   * Authorization: Bearer <jwt-token>
   * Content-Type: application/json
   * Body: {
   *   "feedback": {
   *     "body": "Prueba app"
   *   }
   * }
   */
  @Post('orders/:orderId/feedbacks')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async createOrderFeedback(
    @Param('orderId') orderId: string,
    @Body() dto: CreateMobileOrderFeedbackRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    return this.createMobileOrderFeedbackUseCase.execute(
      orderId,
      dto.feedback.body,
      user,
    );
  }

  /**
   * Endpoint para finalizar una orden (móvil)
   * 
   * Finaliza una orden desde la API móvil de Wispro
   * usando el token de autenticación móvil del JWT token.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * El token debe contener wisproMobile.token obtenido del login móvil.
   * 
   * @param orderId - ID de la orden
   * @param dto - Datos para finalizar la orden (feedback opcional y order con initialized_at, finalized_at, result)
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Objeto con la orden finalizada desde la API móvil de Wispro (sin transformar)
   * 
   * @example
   * PATCH /mobile/v1/orders/bff84336-e781-4ce8-8e37-e6f8ca8ed635/finalize
   * Authorization: Bearer <jwt-token>
   * Content-Type: application/json
   * Body: {
   *   "feedback": {
   *     "body": "Todo correcto"
   *   },
   *   "order": {
   *     "initialized_at": "2026-02-12T18:41:14.695Z",
   *     "finalized_at": "2026-02-12T20:23:50.385Z",
   *     "result": "success"
   *   }
   * }
   */
  @Patch('orders/:orderId/finalize')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async finalizeOrder(
    @Param('orderId') orderId: string,
    @Body() dto: FinalizeMobileOrderRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    return this.finalizeMobileOrderUseCase.execute(orderId, dto, user);
  }

  /**
   * Endpoint para reagendar una orden (móvil)
   * 
   * Reagenda una orden desde la API móvil de Wispro
   * usando el token de autenticación móvil del JWT token.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * El token debe contener wisproMobile.token obtenido del login móvil.
   * 
   * @param orderId - ID de la orden
   * @param dto - Datos del feedback con la razón del reagendamiento (feedback.body)
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Objeto con la orden reagendada desde la API móvil de Wispro (sin transformar)
   * 
   * @example
   * PATCH /mobile/v1/orders/882ea65f-5da0-4ad9-bfdc-803172c5e194/reschedule
   * Authorization: Bearer <jwt-token>
   * Content-Type: application/json
   * Body: {
   *   "feedback": {
   *     "body": "El usuario no está"
   *   }
   * }
   */
  @Patch('orders/:orderId/reschedule')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async rescheduleOrder(
    @Param('orderId') orderId: string,
    @Body() dto: RescheduleMobileOrderRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    return this.rescheduleMobileOrderUseCase.execute(
      orderId,
      dto.feedback.body,
      user,
    );
  }

  /**
   * Endpoint para listar materiales (móvil)
   * 
   * Lista materiales con paginación desde el inventario interno.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param query - Query parameters:
   *   - page: número de página (default: 1)
   *   - per_page: resultados por página (default: 20)
   *   - search: término de búsqueda por nombre o categoría (opcional)
   * @returns Lista de materiales con paginación
   * 
   * @example
   * GET /mobile/v1/inventory/materials?page=1&per_page=20&search=Cable
   * Authorization: Bearer <jwt-token>
   * 
   * Response:
   * {
   *   "materials": [
   *     {
   *       "id": "uuid-del-material",
   *       "name": "Cable UTP Cat6",
   *       "unit": "metro",
   *       "minStock": 0,
   *       "category": "GENERAL",
   *       "images": null,
   *       "ownershipType": "TECHNICIAN",
   *       "createdAt": "2026-02-05T..."
   *     }
   *   ],
   *   "pagination": {
   *     "page": 1,
   *     "per_page": 20,
   *     "total": 50,
   *     "total_pages": 3
   *   }
   * }
   */
  @Get('inventory/materials')
  @UseGuards(JwtAuthGuard)
  async getMaterials(
    @Query() query: GetMaterialsRequestDto,
  ): Promise<GetMaterialsResponseDto> {
    const perPage = query.per_page || 20;
    const page = query.page || 1;
    const search = query.search?.trim() || undefined;

    const { items, total } = await this.inventoryService.getMaterialsPaginated(page, perPage, search);

    const materials = items.map((m) => ({
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
   * Endpoint para obtener los gastos de material de una orden (móvil)
   * 
   * Obtiene solo los gastos de material (feedbacks de tipo material) de una orden
   * desde la API de Wispro usando las credenciales de autenticación del JWT token.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param orderId - ID de la orden
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Lista de gastos de material con los materiales parseados
   * 
   * @example
   * GET /mobile/v1/orders/c530112f-21ac-48ab-948b-609dbd0cf4e2/materials
   * Authorization: Bearer <jwt-token>
   * 
   * Response:
   * {
   *   "materials": [
   *     {
   *       "id": "material-id-123",
   *       "name": "Cable UTP",
   *       "quantityUsed": 10,
   *       "quantityDamaged": 0,
   *       "unit": "metros"
   *     },
   *     {
   *       "id": "material-id-456",
   *       "name": "Conector RJ45",
   *       "quantityUsed": 2,
   *       "quantityDamaged": 1,
   *       "unit": "unidades"
   *     }
   *   ]
   * }
   */
  @Get('orders/:orderId/materials')
  @UseGuards(JwtAuthGuard)
  async getMaterialExpenses(
    @Param('orderId') orderId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<GetMobileMaterialExpensesResponseDto> {
    return this.getMobileMaterialExpensesUseCase.execute(orderId, user);
  }

  /**
   * Endpoint para crear un gasto de material en una orden (móvil)
   * 
   * Crea un gasto de material en una orden en la API de Wispro.
   * Los materiales se envían en un formato amigable y se convierten a JSON en el backend
   * antes de enviarlos a Wispro con el feedback_kind_id correcto.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param orderId - ID de la orden
   * @param dto - Datos de los materiales a registrar
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Lista de gastos de material (incluyendo el nuevo)
   * 
   * @example
   * POST /mobile/v1/orders/c530112f-21ac-48ab-948b-609dbd0cf4e2/materials
   * Authorization: Bearer <jwt-token>
   * Content-Type: application/json
   * Body: {
   *   "materials": [
   *     {
   *       "id": "material-id-123",
   *       "name": "Cable UTP",
   *       "quantityUsed": 10,
   *       "quantityDamaged": 0,
   *       "unit": "metros"
   *     },
   *     {
   *       "id": "material-id-456",
   *       "name": "Conector RJ45",
   *       "quantityUsed": 2,
   *       "quantityDamaged": 1,
   *       "unit": "unidades"
   *     }
   *   ],
   *   "locale": "es"
   * }
   * 
   * Response:
   * {
   *   "materials": [
   *     {
   *       "id": "material-id-123",
   *       "name": "Cable UTP",
   *       "quantityUsed": 10,
   *       "quantityDamaged": 0,
   *       "unit": "metros"
   *     },
   *     {
   *       "id": "material-id-456",
   *       "name": "Conector RJ45",
   *       "quantityUsed": 2,
   *       "quantityDamaged": 1,
   *       "unit": "unidades"
   *     }
   *   ]
   * }
   */
  @Post('orders/:orderId/materials')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async createMaterialExpense(
    @Param('orderId') orderId: string,
    @Body() dto: CreateMaterialExpenseRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<GetMobileMaterialExpensesResponseDto> {
    return this.createMobileMaterialExpenseUseCase.execute(orderId, dto, user);
  }
}

