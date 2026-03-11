/**
 * Wispro Session Refresh Module
 *
 * Módulo que registra el worker programado para renovar las sesiones Wispro en DB.
 * Se importa en AppModule junto con ScheduleModule.forRoot().
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalUser } from '@infrastructure/persistence/entities/internal-user.entity';
import { WisproAutomationModule } from '@infrastructure/automation';
import { WisproSessionRefreshService } from './wispro-session-refresh.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InternalUser]),
    WisproAutomationModule,
  ],
  providers: [WisproSessionRefreshService],
  exports: [WisproSessionRefreshService],
})
export class WisproSessionRefreshModule {}
