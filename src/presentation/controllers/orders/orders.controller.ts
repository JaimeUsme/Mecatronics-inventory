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
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  GetOrdersUseCase,
  GetOrderImagesUseCase,
  UploadOrderImageUseCase,
  DeleteOrderImageUseCase,
  GetOrderFeedbacksUseCase,
  CreateOrderFeedbackUseCase,
} from '@application/use-cases';
import {
  GetOrdersRequestDto,
  GetOrdersResponseDto,
  OrderImageDto,
  OrderFeedbackDto,
  CreateOrderFeedbackRequestDto,
} from '@presentation/dto';
import { JwtAuthGuard } from '@presentation/guards';
import { CurrentUser } from '@presentation/decorators';
import { JwtPayload } from '@infrastructure/auth/jwt';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly getOrdersUseCase: GetOrdersUseCase,
    private readonly getOrderImagesUseCase: GetOrderImagesUseCase,
    private readonly uploadOrderImageUseCase: UploadOrderImageUseCase,
    private readonly deleteOrderImageUseCase: DeleteOrderImageUseCase,
    private readonly getOrderFeedbacksUseCase: GetOrderFeedbacksUseCase,
    private readonly createOrderFeedbackUseCase: CreateOrderFeedbackUseCase,
  ) {}

  /**
   * Endpoint para obtener la lista de órdenes
   * 
   * Obtiene la lista de órdenes desde la API de Wispro
   * usando las credenciales de autenticación del JWT token.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param query - Query parameters (per_page, page, in_progress, scheduled, completed, employee_id)
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Lista de órdenes desde la API de Wispro
   * 
   * @example
   * GET /orders?per_page=20&page=1
   * GET /orders?per_page=20&page=1&in_progress=true&scheduled=true
   * GET /orders?per_page=20&page=1&completed=true
   * GET /orders?per_page=20&page=1&employee_id=11b17a34-cd35-4c3c-9396-648d57408ab7
   * GET /orders?per_page=20&page=1&in_progress=true&scheduled=true&employee_id=11b17a34-cd35-4c3c-9396-648d57408ab7
   * GET /orders?per_page=20&page=1&completed=true&employee_id=11b17a34-cd35-4c3c-9396-648d57408ab7
   * Authorization: Bearer <jwt-token>
   */
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
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param orderId - ID de la orden
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Array de imágenes de la orden
   * 
   * @example
   * GET /orders/c530112f-21ac-48ab-948b-609dbd0cf4e2/images
   * Authorization: Bearer <jwt-token>
   */
  @Get(':orderId/images')
  @UseGuards(JwtAuthGuard)
  async getOrderImages(
    @Param('orderId') orderId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrderImageDto[]> {
    return this.getOrderImagesUseCase.execute(orderId, user);
  }

  /**
   * Endpoint para subir una imagen a una orden
   * 
   * Sube una imagen a una orden en la API de Wispro usando multipart/form-data
   * y las credenciales de autenticación del JWT token.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param orderId - ID de la orden
   * @param file - Archivo a subir (multipart/form-data)
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Array de imágenes de la orden (incluyendo la nueva)
   * 
   * @example
   * POST /orders/c530112f-21ac-48ab-948b-609dbd0cf4e2/images
   * Authorization: Bearer <jwt-token>
   * Content-Type: multipart/form-data
   * Body: image=<file>
   */
  @Post(':orderId/images')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file[]'))
  async uploadOrderImage(
    @Param('orderId') orderId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrderImageDto[]> {
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
   * Después de eliminar la imagen, devuelve la lista completa de imágenes
   * (sin la imagen eliminada).
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param orderId - ID de la orden
   * @param imageId - ID de la imagen a eliminar
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Lista completa de imágenes (sin la eliminada)
   * 
   * @example
   * DELETE /orders/c530112f-21ac-48ab-948b-609dbd0cf4e2/images/afae66db-7a98-4194-a3c4-52165d47e74e
   * Authorization: Bearer <jwt-token>
   */
  @Delete(':orderId/images/:imageId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteOrderImage(
    @Param('orderId') orderId: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrderImageDto[]> {
    return this.deleteOrderImageUseCase.execute(orderId, imageId, user);
  }

  /**
   * Endpoint para obtener los feedbacks de una orden
   * 
   * Obtiene los feedbacks asociados a una orden desde la API de Wispro
   * usando las credenciales de autenticación del JWT token.
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param orderId - ID de la orden
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Array de feedbacks de la orden
   * 
   * @example
   * GET /orders/c530112f-21ac-48ab-948b-609dbd0cf4e2/feedbacks
   * Authorization: Bearer <jwt-token>
   */
  @Get(':orderId/feedbacks')
  @UseGuards(JwtAuthGuard)
  async getOrderFeedbacks(
    @Param('orderId') orderId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrderFeedbackDto[]> {
    return this.getOrderFeedbacksUseCase.execute(orderId, user);
  }

  /**
   * Endpoint para crear un feedback en una orden
   * 
   * Crea un feedback en una orden en la API de Wispro
   * usando las credenciales de autenticación del JWT token.
   * Después de crear el feedback, devuelve la lista completa de feedbacks
   * (incluyendo el nuevo feedback creado).
   * 
   * Requiere un JWT token válido en el header Authorization: Bearer <token>
   * 
   * @param orderId - ID de la orden
   * @param dto - Datos del feedback a crear
   * @param user - Payload del JWT token (inyectado automáticamente por el guard)
   * @returns Lista completa de feedbacks (incluyendo el nuevo)
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
   */
  @Post(':orderId/feedbacks')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async createOrderFeedback(
    @Param('orderId') orderId: string,
    @Body() dto: CreateOrderFeedbackRequestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<OrderFeedbackDto[]> {
    return this.createOrderFeedbackUseCase.execute(orderId, dto, user);
  }
}

