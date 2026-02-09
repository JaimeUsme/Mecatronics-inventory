/**
 * Order Crew Snapshot Service
 *
 * Servicio para crear y consultar snapshots históricos de cuadrillas
 * asociados a órdenes de servicio.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderCrewSnapshot, CrewMember, Crew } from '@infrastructure/persistence/entities';

@Injectable()
export class OrderCrewSnapshotService {
  private readonly logger = new Logger(OrderCrewSnapshotService.name);

  constructor(
    @InjectRepository(OrderCrewSnapshot)
    private readonly snapshotRepository: Repository<OrderCrewSnapshot>,
    @InjectRepository(CrewMember)
    private readonly crewMemberRepository: Repository<CrewMember>,
    @InjectRepository(Crew)
    private readonly crewRepository: Repository<Crew>,
  ) {}

  /**
   * Obtiene o crea un snapshot de la cuadrilla para una orden
   * Si ya existe un snapshot, lo devuelve. Si no, crea uno nuevo.
   *
   * @param orderId - ID de la orden de Wispro
   * @param employeeId - ID del empleado asignado a la orden
   * @returns Snapshot de la cuadrilla (puede ser null si el empleado no está en ninguna cuadrilla)
   */
  async getOrCreateSnapshot(orderId: string, employeeId: string): Promise<OrderCrewSnapshot | null> {
    // Verificar si ya existe un snapshot para esta orden
    const existingSnapshot = await this.snapshotRepository.findOne({
      where: { orderId },
    });

    if (existingSnapshot) {
      this.logger.debug(`Snapshot existente encontrado para orden ${orderId}`);
      return existingSnapshot;
    }

    // Buscar la cuadrilla activa del empleado
    const crewMember = await this.crewMemberRepository
      .createQueryBuilder('member')
      .innerJoin('member.crew', 'crew')
      .where('member.technicianId = :employeeId', { employeeId })
      .andWhere('crew.active = :active', { active: true })
      .getOne();

    if (!crewMember) {
      this.logger.debug(`Empleado ${employeeId} no está en ninguna cuadrilla activa para orden ${orderId}`);
      // Crear snapshot indicando que no estaba en ninguna cuadrilla
      const snapshot = this.snapshotRepository.create({
        orderId,
        employeeId,
        crewId: null,
        crewName: null,
        crewMemberIds: null,
        crewMembers: null,
      });
      return await this.snapshotRepository.save(snapshot);
    }

    // Obtener la cuadrilla completa
    const crew = await this.crewRepository.findOne({
      where: { id: crewMember.crewId },
      relations: ['members'],
    });

    if (!crew) {
      this.logger.warn(`Cuadrilla ${crewMember.crewId} no encontrada para orden ${orderId}`);
      return null;
    }

    // Obtener todos los miembros activos de la cuadrilla
    const allMembers = await this.crewMemberRepository.find({
      where: { crewId: crew.id },
    });

    // Crear snapshot con la información de la cuadrilla
    const snapshot = this.snapshotRepository.create({
      orderId,
      employeeId,
      crewId: crew.id,
      crewName: crew.name,
      crewMemberIds: allMembers.map((m) => m.technicianId),
      crewMembers: allMembers.map((m) => ({
        technicianId: m.technicianId,
        role: m.role,
      })),
    });

    const savedSnapshot = await this.snapshotRepository.save(snapshot);
    this.logger.log(
      `Snapshot creado para orden ${orderId}: cuadrilla ${crew.name} con ${allMembers.length} miembros`,
    );

    return savedSnapshot;
  }

  /**
   * Obtiene un snapshot existente para una orden
   *
   * @param orderId - ID de la orden de Wispro
   * @returns Snapshot de la cuadrilla o null si no existe
   */
  async getSnapshot(orderId: string): Promise<OrderCrewSnapshot | null> {
    return await this.snapshotRepository.findOne({
      where: { orderId },
    });
  }

  /**
   * Obtiene todos los snapshots para múltiples órdenes
   *
   * @param orderIds - Array de IDs de órdenes
   * @returns Map de orderId -> OrderCrewSnapshot
   */
  async getSnapshotsForOrders(orderIds: string[]): Promise<Map<string, OrderCrewSnapshot>> {
    if (orderIds.length === 0) {
      return new Map();
    }

    const snapshots = await this.snapshotRepository.find({
      where: orderIds.map((orderId) => ({ orderId })),
    });

    const snapshotMap = new Map<string, OrderCrewSnapshot>();
    for (const snapshot of snapshots) {
      snapshotMap.set(snapshot.orderId, snapshot);
    }

    return snapshotMap;
  }
}

