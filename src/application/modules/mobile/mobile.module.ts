/**
 * Mobile Module
 * 
 * Módulo que agrupa todos los componentes relacionados con la aplicación móvil:
 * - Casos de uso móviles
 * - Controladores móviles
 * - Cliente HTTP de Wispro Mobile API
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { WisproApiModule } from '@infrastructure/external';
import { InternalUser } from '@infrastructure/persistence/entities';
import { MobileLoginUseCase, GetMobileOrdersUseCase, GetMobileOrderFeedbacksUseCase, GetMobileOrderImagesUseCase, UploadMobileOrderImagesUseCase, DeleteMobileOrderImageUseCase, CreateMobileOrderFeedbackUseCase, CreateMobileMaterialExpenseUseCase, GetMobileMaterialExpensesUseCase, FinalizeMobileOrderUseCase, RescheduleMobileOrderUseCase } from '@application/use-cases/mobile';
import { MobileController } from '@presentation/controllers';
import { jwtConfig } from '@config/jwt.config';
import { InventoryModule } from '@application/services/inventory/inventory.module';

@Module({
  imports: [
    InventoryModule,
    WisproApiModule,
    TypeOrmModule.forFeature([InternalUser]),
    JwtModule.register({
      secret: jwtConfig.secret,
      signOptions: { expiresIn: jwtConfig.expiresIn },
    }),
  ],
  controllers: [MobileController],
  providers: [MobileLoginUseCase, GetMobileOrdersUseCase, GetMobileOrderFeedbacksUseCase, GetMobileOrderImagesUseCase, UploadMobileOrderImagesUseCase, DeleteMobileOrderImageUseCase, CreateMobileOrderFeedbackUseCase, CreateMobileMaterialExpenseUseCase, GetMobileMaterialExpensesUseCase, FinalizeMobileOrderUseCase, RescheduleMobileOrderUseCase],
  exports: [MobileLoginUseCase, GetMobileOrdersUseCase, GetMobileOrderFeedbacksUseCase, GetMobileOrderImagesUseCase, UploadMobileOrderImagesUseCase, DeleteMobileOrderImageUseCase, CreateMobileOrderFeedbackUseCase, CreateMobileMaterialExpenseUseCase, GetMobileMaterialExpensesUseCase, FinalizeMobileOrderUseCase, RescheduleMobileOrderUseCase],
})
export class MobileModule {}

