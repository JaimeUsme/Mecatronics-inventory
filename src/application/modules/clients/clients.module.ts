import { Module } from '@nestjs/common';
import { WisproApiModule } from '@infrastructure/external';
import { GetDeletedClientsUseCase, GetClientLoginQrUseCase } from '@application/use-cases/clients';
import { ClientsController } from '@presentation/controllers/clients';
import { SharedModule } from '@application/modules/shared/shared.module';

@Module({
  imports: [WisproApiModule, SharedModule],
  controllers: [ClientsController],
  providers: [GetDeletedClientsUseCase, GetClientLoginQrUseCase],
  exports: [GetDeletedClientsUseCase, GetClientLoginQrUseCase],
})
export class ClientsModule {}
