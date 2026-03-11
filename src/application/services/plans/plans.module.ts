import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plan } from '@infrastructure/persistence/entities';
import { PlansService } from './plans.service';

@Module({
  imports: [TypeOrmModule.forFeature([Plan])],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}
