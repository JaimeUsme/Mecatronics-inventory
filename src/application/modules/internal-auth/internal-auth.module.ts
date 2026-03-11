import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalUser } from '@infrastructure/persistence/entities';
import { InternalAuthService } from '@application/services/internal-auth';
import { InternalAuthController } from '@presentation/controllers/internal-auth/internal-auth.controller';
import { WisproRefreshController } from '@presentation/controllers/internal-auth/wispro-refresh.controller';
import { JwtAuthModule } from '@infrastructure/auth/jwt';
import { WisproAutomationModule } from '@infrastructure/automation';
import { WisproSessionRefreshModule } from '@infrastructure/external/wispro/wispro-session-refresh.module';

@Module({
  imports: [TypeOrmModule.forFeature([InternalUser]), JwtAuthModule, WisproAutomationModule, WisproSessionRefreshModule],
  controllers: [InternalAuthController, WisproRefreshController],
  providers: [InternalAuthService],
  exports: [InternalAuthService],
})
export class InternalAuthModule {}


