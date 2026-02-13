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
  GetOrderCountsUseCase,
  GetOrderImagesUseCase,
  UploadOrderImageUseCase,
  DeleteOrderImageUseCase,
  GetOrderFeedbacksUseCase,
  CreateOrderFeedbackUseCase,
  CreateMaterialExpenseUseCase,
  GetMaterialExpensesUseCase,
  RescheduleOrderUseCase,
  CloseOrderUseCase,
} from '@application/use-cases';
import { OrdersController } from '@presentation/controllers';
import { OrderCrewSnapshotModule } from '@application/services/orders/order-crew-snapshot.module';
import { AuthenticationModule } from '../authentication/authentication.module';

@Module({
  imports: [WisproApiModule, OrderCrewSnapshotModule, AuthenticationModule],
  controllers: [OrdersController],
  providers: [
    GetOrdersUseCase,
    GetOrderCountsUseCase,
    GetOrderImagesUseCase,
    UploadOrderImageUseCase,
    DeleteOrderImageUseCase,
    GetOrderFeedbacksUseCase,
    CreateOrderFeedbackUseCase,
    CreateMaterialExpenseUseCase,
    GetMaterialExpensesUseCase,
    RescheduleOrderUseCase,
    CloseOrderUseCase,
  ],
  exports: [
    GetOrdersUseCase,
    GetOrderCountsUseCase,
    GetOrderImagesUseCase,
    UploadOrderImageUseCase,
    DeleteOrderImageUseCase,
    GetOrderFeedbacksUseCase,
    CreateOrderFeedbackUseCase,
    CreateMaterialExpenseUseCase,
    GetMaterialExpensesUseCase,
    RescheduleOrderUseCase,
    CloseOrderUseCase,
  ],
})
export class OrdersModule {}

