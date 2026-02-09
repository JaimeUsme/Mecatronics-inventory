import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalUser } from '@infrastructure/persistence/entities';
import { InternalAuthService } from '@application/services/internal-auth';
import { InternalAuthController } from '@presentation/controllers/internal-auth/internal-auth.controller';
import { JwtAuthModule } from '@infrastructure/auth/jwt';
import { WisproAutomationModule } from '@infrastructure/automation';

@Module({
  imports: [TypeOrmModule.forFeature([InternalUser]), JwtAuthModule, WisproAutomationModule],
  controllers: [InternalAuthController],
  providers: [InternalAuthService],
  exports: [InternalAuthService],
})
export class InternalAuthModule {}


