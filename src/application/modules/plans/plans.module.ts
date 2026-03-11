import { Module } from '@nestjs/common';
import { PlansModule as PlansServiceModule } from '@application/services/plans';
import { PlansController } from '@presentation/controllers/plans';
import { WisproApiModule } from '@infrastructure/external/wispro';
import { GetWisproPublicPlansUseCase } from '@application/use-cases/plans';

@Module({
  imports: [PlansServiceModule, WisproApiModule],
  controllers: [PlansController],
  providers: [GetWisproPublicPlansUseCase],
  exports: [PlansServiceModule],
})
export class PlansModule {}
