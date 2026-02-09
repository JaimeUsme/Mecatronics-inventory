/**
 * Orders Module
 * 
 * Módulo que agrupa todos los componentes relacionados con órdenes:
 * - Casos de uso de órdenes
 * - Controladores de órdenes
 * - Cliente HTTP de Wispro API
 */
import { Module } from '@nestjs/common';
import { WisproApiModule } from '@infrastructure/external';
import {
  GetOrdersUseCase,
  GetOrderImagesUseCase,
  UploadOrderImageUseCase,
  DeleteOrderImageUseCase,
  GetOrderFeedbacksUseCase,
  CreateOrderFeedbackUseCase,
} from '@application/use-cases';
import { OrdersController } from '@presentation/controllers';
import { OrderCrewSnapshotModule } from '@application/services/orders/order-crew-snapshot.module';

@Module({
  imports: [WisproApiModule, OrderCrewSnapshotModule],
  controllers: [OrdersController],
  providers: [
    GetOrdersUseCase,
    GetOrderImagesUseCase,
    UploadOrderImageUseCase,
    DeleteOrderImageUseCase,
    GetOrderFeedbacksUseCase,
    CreateOrderFeedbackUseCase,
  ],
  exports: [
    GetOrdersUseCase,
    GetOrderImagesUseCase,
    UploadOrderImageUseCase,
    DeleteOrderImageUseCase,
    GetOrderFeedbacksUseCase,
    CreateOrderFeedbackUseCase,
  ],
})
export class OrdersModule {}

