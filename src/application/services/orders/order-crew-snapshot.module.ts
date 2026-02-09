import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderCrewSnapshot, CrewMember, Crew } from '@infrastructure/persistence/entities';
import { OrderCrewSnapshotService } from './order-crew-snapshot.service';

@Module({
  imports: [TypeOrmModule.forFeature([OrderCrewSnapshot, CrewMember, Crew])],
  providers: [OrderCrewSnapshotService],
  exports: [OrderCrewSnapshotService],
})
export class OrderCrewSnapshotModule {}

