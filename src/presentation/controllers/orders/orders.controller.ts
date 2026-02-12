/**
 * Orders Controller
 * 
 * Controlador que maneja los endpoints relacionados con órdenes.
 * Expone endpoints REST para operaciones de órdenes.
 */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  GetOrdersUseCase,
  GetOrderCountsUseCase,
  GetOrderImagesUseCase,
  UploadOrderImageUseCase,
  DeleteOrderImageUseCase,
  GetOrderFeedbacksUseCase,
  CreateOrderFeedbackUseCase,
  RescheduleOrderUseCase,
  CloseOrderUseCase,
  GetProfileUseCase,
} from '@application/use-cases';
import {
  GetOrdersRequestDto,
  GetOrdersResponseDto,
  GetOrderCountsRequestDto,
  OrderCountsResponseDto,
  OrderImageDto,
  GetOrderImagesResponseDto,
  OrderFeedbackDto,
  GetOrderFeedbacksResponseDto,
  CreateOrderFeedbackRequestDto,
  RescheduleOrderRequestDto,
} from '@presentation/dto';
import { JwtAuthGuard } from '@presentation/guards';
import { CurrentUser } from '@presentation/decorators';
import { JwtPayload } from '@infrastructure/auth/jwt';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly getOrdersUseCase: GetOrdersUseCase,
    private readonly getOrderCountsUseCase: GetOrderCountsUseCase,
    private readonly getOrderImagesUseCase: GetOrderImagesUseCase,
    private readonly uploadOrderImageUseCase: UploadOrderImageUseCase,
    private readonly deleteOrderImageUseCase: DeleteOrderImageUseCase,
    private readonly getOrderFeedbacksUseCase: GetOrderFeedbacksUseCase,
    private readonly createOrderFeedbackUseCase: CreateOrderFeedbackUseCase,
    private readonly rescheduleOrderUseCase: RescheduleOrderUseCase,
    private readonly closeOrderUseCase: CloseOrderUseCase,
    private readonly getProfileUseCase: GetProfileUseCase,
  ) {}

  /**
   * Endpoint para obtener las órdenes del usuario actual
   * 
   * Obtiene solo las órdenes del usuario de Wispro logueado actualmente.
   * El userable_id se obtiene automáticamente del JWT token.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param query - Query parameters:
   *   - per_page: número de resultados por página (default: 20)
   *   - page: número de página (default: 1)
   *   - in_progress: filtrar órdenes en progreso
   *   - scheduled: filtrar órdenes programadas
   *   - completed: filtrar órdenes completadas y exitosas
   *   - unscheduled: filtrar órdenes no programadas (q[unscheduled]=true)
   *   - scheduled_state: filtrar órdenes programadas (q[scheduled]=true)
   *   - success: filtrar órdenes exitosas (q[success]=true)
   *   - failure: filtrar órdenes fallidas (q[failure]=true)
   *   - search: buscar por nombre o cédula del cliente (q[orderable_name_unaccent_cont])
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Lista de órdenes del usuario actual desde la API de Wispro
   * 
   * @example
   * GET /orders/my-orders?per_page=20&page=1
   * GET /orders/my-orders?per_page=20&page=1&in_progress=true&scheduled=true
   * GET /orders/my-orders?per_page=20&page=1&completed=true
   * GET /orders/my-orders?per_page=20&page=1&search=Jaime Usme
   * GET /orders/my-orders?per_page=20&page=1&unscheduled=true
   * GET /orders/my-orders?per_page=20&page=1&success=true
   * Authorization: Bearer <jwt-token>
   */
  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  async getMyOrders(
    @Query() query: GetOrdersRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<GetOrdersResponseDto> {
    // Obtener el userable_id del usuario actual desde el perfil
    const profile = await this.getProfileUseCase.execute(user);
    
    if (!profile.userable_id) {
      throw new BadRequestException(
        'No se pudo obtener el userable_id del usuario. Asegúrate de tener una cuenta de Wispro vinculada y conectada.',
      );
    }

    // Crear un nuevo query con el employee_id automáticamente establecido
    const queryWithEmployeeId: GetOrdersRequestDto = {
      ...query,
      employee_id: profile.userable_id,
    };

    return this.getOrdersUseCase.execute(queryWithEmployeeId, user);
  }

  /**
   * Endpoint para obtener la lista de órdenes
   * 
   * Obtiene la lista de órdenes desde la API de Wispro
   * usando las credenciales de autenticación del JWT token.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param query - Query parameters:
   *   - per_page: número de resultados por página (default: 20)
   *   - page: número de página (default: 1)
   *   - in_progress: filtrar órdenes en progreso
   *   - scheduled: filtrar órdenes programadas
   *   - completed: filtrar órdenes completadas y exitosas
   *   - employee_id: filtrar por ID de empleado específico
   *   - unscheduled: filtrar órdenes no programadas (q[unscheduled]=true)
   *   - scheduled_state: filtrar órdenes programadas (q[scheduled]=true)
   *   - success: filtrar órdenes exitosas (q[success]=true)
   *   - failure: filtrar órdenes fallidas (q[failure]=true)
   *   - search: buscar por nombre o cédula del cliente (q[orderable_name_unaccent_cont])
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Lista de órdenes desde la API de Wispro
   * 
   * @example
   * GET /orders?per_page=20&page=1
   * GET /orders?per_page=20&page=1&in_progress=true&scheduled=true
   * GET /orders?per_page=20&page=1&completed=true
   * GET /orders?per_page=20&page=1&employee_id=11b17a34-cd35-4c3c-9396-648d57408ab7
   * GET /orders?per_page=20&page=1&search=Jaime Usme
   * GET /orders?per_page=20&page=1&unscheduled=true
   * GET /orders?per_page=20&page=1&success=true&failure=false
   * Authorization: Bearer <jwt-token>
   */
  /**
   * Endpoint para obtener los conteos de órdenes por categoría
   * 
   * Obtiene el total de órdenes fallidas, exitosas, programadas y sin programar
   * desde la API de Wispro usando las credenciales de autenticación del JWT token.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param query - Query parameters (search: buscar por nombre o cédula del cliente)
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Conteos de órdenes por categoría
   * 
   * @example
   * GET /orders/counts
   * GET /orders/counts?search=JUAN CARLOS
   * Authorization: Bearer <jwt-token>
   */
  @Get('counts')
  @UseGuards(JwtAuthGuard)
  async getOrderCounts(
    @Query() query: GetOrderCountsRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrderCountsResponseDto> {
    return this.getOrderCountsUseCase.execute(user, undefined, query.search);
  }

  /**
   * Endpoint para obtener los conteos de "mis órdenes" por categoría
   * 
   * Obtiene el total de órdenes fallidas, exitosas, programadas y sin programar
   * del usuario autenticado desde la API de Wispro.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param query - Query parameters (search: buscar por nombre o cédula del cliente)
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Conteos de órdenes del usuario por categoría
   * 
   * @example
   * GET /orders/my-orders/counts
   * GET /orders/my-orders/counts?search=JUAN CARLOS
   * Authorization: Bearer <jwt-token>
   */
  @Get('my-orders/counts')
  @UseGuards(JwtAuthGuard)
  async getMyOrderCounts(
    @Query() query: GetOrderCountsRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrderCountsResponseDto> {
    // Obtener el userable_id del usuario actual desde el perfil
    const profile = await this.getProfileUseCase.execute(user);
    
    if (!profile.userable_id) {
      throw new BadRequestException(
        'No se pudo obtener el userable_id del usuario. Asegúrate de tener una cuenta de Wispro vinculada y conectada.',
      );
    }

    return this.getOrderCountsUseCase.execute(user, profile.userable_id, query.search);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getOrders(
    @Query() query: GetOrdersRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<GetOrdersResponseDto> {
    return this.getOrdersUseCase.execute(query, user);
  }

  /**
   * Endpoint para obtener las imágenes de una orden
   * 
   * Obtiene las imágenes asociadas a una orden desde la API de Wispro
   * usando las credenciales de autenticación del JWT token.
   * Separa las imágenes normales de las firmas (filename que empieza con 'sign-').
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param orderId - ID de la orden
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Objeto con imágenes normales y firma separadas
   * 
   * @example
   * GET /orders/c530112f-21ac-48ab-948b-609dbd0cf4e2/images
   * Authorization: Bearer <jwt-token>
   * 
   * Response:
   * {
   *   "images": [...], // Imágenes normales
   *   "sign": {...} | null // Firma si existe
   * }
   */
  @Get(':orderId/images')
  @UseGuards(JwtAuthGuard)
  async getOrderImages(
    @Param('orderId') orderId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<GetOrderImagesResponseDto> {
    return this.getOrderImagesUseCase.execute(orderId, user);
  }

  /**
   * Endpoint para subir una imagen a una orden
   * 
   * Sube una imagen a una orden en la API de Wispro usando multipart/form-data
   * y las credenciales de autenticación del JWT token.
   * Después de subir la imagen, devuelve la lista completa de imágenes separadas.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param orderId - ID de la orden
   * @param file - Archivo a subir (multipart/form-data)
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Objeto con imágenes normales y firma separadas (incluyendo la nueva)
   * 
   * @example
   * POST /orders/c530112f-21ac-48ab-948b-609dbd0cf4e2/images
   * Authorization: Bearer <jwt-token>
   * Content-Type: multipart/form-data
   * Body: file[]=<file>
   * 
   * Response:
   * {
   *   "images": [...], // Imágenes normales
   *   "sign": {...} | null // Firma si existe
   * }
   */
  @Post(':orderId/images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file[]'))
  async uploadOrderImage(
    @Param('orderId') orderId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ): Promise<GetOrderImagesResponseDto> {
    if (!file) {
      throw new Error('No se proporcionó ningún archivo');
    }
    return this.uploadOrderImageUseCase.execute(orderId, file, user);
  }

  /**
   * Endpoint para eliminar una imagen de una orden
   * 
   * Elimina una imagen de una orden en la API de Wispro
   * usando las credenciales de autenticación del JWT token.
   * Después de eliminar la imagen, devuelve la lista completa de imágenes separadas
   * (sin la imagen eliminada).
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param orderId - ID de la orden
   * @param imageId - ID de la imagen a eliminar
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Objeto con imágenes normales y firma separadas (sin la eliminada)
   * 
   * @example
   * DELETE /orders/c530112f-21ac-48ab-948b-609dbd0cf4e2/images/afae66db-7a98-4194-a3c4-52165d47e74e
   * Authorization: Bearer <jwt-token>
   * 
   * Response:
   * {
   *   "images": [...], // Imágenes normales
   *   "sign": {...} | null // Firma si existe
   * }
   */
  @Delete(':orderId/images/:imageId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteOrderImage(
    @Param('orderId') orderId: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<GetOrderImagesResponseDto> {
    return this.deleteOrderImageUseCase.execute(orderId, imageId, user);
  }

  /**
   * Endpoint para obtener los feedbacks de una orden
   * 
   * Obtiene los feedbacks asociados a una orden desde la API de Wispro
   * usando las credenciales de autenticación del JWT token.
   * Separa los feedbacks normales de los que contienen información de materiales.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param orderId - ID de la orden
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Objeto con feedbacks normales y materiales separados
   * 
   * @example
   * GET /orders/c530112f-21ac-48ab-948b-609dbd0cf4e2/feedbacks
   * Authorization: Bearer <jwt-token>
   * 
   * Response:
   * {
   *   "feedbacks": [...], // Feedbacks normales (comentarios)
   *   "materials": [...] // Feedbacks de materiales
   * }
   */
  @Get(':orderId/feedbacks')
  @UseGuards(JwtAuthGuard)
  async getOrderFeedbacks(
    @Param('orderId') orderId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<GetOrderFeedbacksResponseDto> {
    return this.getOrderFeedbacksUseCase.execute(orderId, user);
  }

  /**
   * Endpoint para crear un feedback en una orden
   * 
   * Crea un feedback en una orden en la API de Wispro
   * usando las credenciales de autenticación del JWT token.
   * Después de crear el feedback, devuelve la lista completa de feedbacks separados
   * (incluyendo el nuevo feedback creado).
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param orderId - ID de la orden
   * @param dto - Datos del feedback a crear
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Objeto con feedbacks normales y materiales separados (incluyendo el nuevo)
   * 
   * @example
   * POST /orders/c530112f-21ac-48ab-948b-609dbd0cf4e2/feedbacks
   * Authorization: Bearer <jwt-token>
   * Content-Type: application/json
   * Body: {
   *   "feedback": {
   *     "body": "Excelente servicio",
   *     "feedback_kind_id": "bd40d1ad-5b89-42a4-a70f-2ec8b2392e16"
   *   },
   *   "locale": "es"
   * }
   * 
   * Response:
   * {
   *   "feedbacks": [...], // Feedbacks normales (comentarios)
   *   "materials": [...] // Feedbacks de materiales
   * }
   */
  @Post(':orderId/feedbacks')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async createOrderFeedback(
    @Param('orderId') orderId: string,
    @Body() dto: CreateOrderFeedbackRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<GetOrderFeedbacksResponseDto> {
    return this.createOrderFeedbackUseCase.execute(orderId, dto, user);
  }

  /**
   * Endpoint para reprogramar una orden
   * 
   * Reprograma una orden cambiando su estado a "to_reschedule" en la API de Wispro
   * usando las credenciales de autenticación del JWT token.
   * Agrega un feedback automático con el motivo de la reprogramación.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param orderId - ID de la orden
   * @param dto - Datos del feedback que explica por qué se reprograma
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Respuesta de la API de Wispro con el nuevo estado de la orden
   * 
   * @example
   * POST /orders/c530112f-21ac-48ab-948b-609dbd0cf4e2/reschedule
   * Authorization: Bearer <jwt-token>
   * Content-Type: application/json
   * Body: {
   *   "feedback_body": "usuario no esta en la casa"
   * }
   */
  @Post(':orderId/reschedule')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async rescheduleOrder(
    @Param('orderId') orderId: string,
    @Body() dto: RescheduleOrderRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    return this.rescheduleOrderUseCase.execute(orderId, dto.feedback_body, user);
  }

  /**
   * Endpoint para cerrar una orden
   * 
   * Cierra una orden cambiando el estado del ticket asociado a "closed" en la API de Wispro.
   * Primero obtiene la orden para extraer el ticketable_id, luego cierra el ticket.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param orderId - ID de la orden
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Respuesta de la API de Wispro con el nuevo estado del ticket
   * 
   * @example
   * PATCH /orders/c530112f-21ac-48ab-948b-609dbd0cf4e2/close
   * Authorization: Bearer <jwt-token>
   */
  @Patch(':orderId/close')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async closeOrder(
    @Param('orderId') orderId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<any> {
    return this.closeOrderUseCase.execute(orderId, user);
  }
}

