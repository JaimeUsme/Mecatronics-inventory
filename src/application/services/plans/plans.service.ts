import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '@infrastructure/persistence/entities';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
  ) {}

  async getPlansPaginated(
    page: number = 1,
    perPage: number = 20,
    search?: string,
    active?: boolean,
  ): Promise<{
    plans: Plan[];
    total: number;
    stats: { total: number; active: number; inactive: number };
  }> {
    const queryBuilder = this.planRepository
      .createQueryBuilder('plan')
      .where('plan.isDeleted = :isDeleted', { isDeleted: false });

    if (search) {
      queryBuilder.andWhere(
        '(plan.name LIKE :search OR plan.description LIKE :search OR plan.wisproPlanIdSingleContract LIKE :search OR plan.wisproPlanIdDoubleContract LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (active !== undefined) {
      queryBuilder.andWhere('plan.isActive = :active', { active });
    }

    const skip = (page - 1) * perPage;
    queryBuilder
      .skip(skip)
      .take(perPage)
      .orderBy('plan.createdAt', 'DESC');

    const [plans, totalFiltered] = await queryBuilder.getManyAndCount();

    const total = await this.planRepository.count({
      where: { isDeleted: false },
    });

    const activeCount = await this.planRepository.count({
      where: { isDeleted: false, isActive: true },
    });

    const inactiveCount = await this.planRepository.count({
      where: { isDeleted: false, isActive: false },
    });

    return {
      plans,
      total: totalFiltered,
      stats: {
        total,
        active: activeCount,
        inactive: inactiveCount,
      },
    };
  }

  async createPlan(
    name: string,
    description: string | null,
    value: number,
    wisproPlanIdSingleContract: string,
    wisproPlanIdDoubleContract: string,
  ): Promise<Plan> {
    const existing = await this.planRepository
      .createQueryBuilder('plan')
      .where('plan.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere(
        '(plan.wisproPlanIdSingleContract = :single OR plan.wisproPlanIdDoubleContract = :single OR plan.wisproPlanIdSingleContract = :double OR plan.wisproPlanIdDoubleContract = :double)',
        {
          single: wisproPlanIdSingleContract,
          double: wisproPlanIdDoubleContract,
        },
      )
      .getOne();

    if (existing) {
      throw new ConflictException(
        'Ya existe un plan activo/no eliminado con alguno de los Wispro Plan IDs enviados',
      );
    }

    const plan = this.planRepository.create({
      name,
      description,
      value,
      wisproPlanIdSingleContract,
      wisproPlanIdDoubleContract,
      isActive: true,
      isDeleted: false,
    });

    const saved = await this.planRepository.save(plan);
    this.logger.log(`Plan creado: ${saved.id}`);
    return saved;
  }

  async updatePlan(
    id: string,
    updates: {
      name?: string;
      description?: string | null;
      value?: number;
      wisproPlanIdSingleContract?: string;
      wisproPlanIdDoubleContract?: string;
    },
  ): Promise<Plan> {
    const plan = await this.planRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!plan) {
      throw new NotFoundException(`Plan con ID ${id} no encontrado`);
    }

    const nextSingle =
      updates.wisproPlanIdSingleContract ?? plan.wisproPlanIdSingleContract;
    const nextDouble =
      updates.wisproPlanIdDoubleContract ?? plan.wisproPlanIdDoubleContract;

    const shouldValidateUniqueness =
      updates.wisproPlanIdSingleContract !== undefined ||
      updates.wisproPlanIdDoubleContract !== undefined;

    if (shouldValidateUniqueness) {
      const existing = await this.planRepository
        .createQueryBuilder('existingPlan')
        .where('existingPlan.isDeleted = :isDeleted', { isDeleted: false })
        .andWhere('existingPlan.id != :id', { id })
        .andWhere(
          '(existingPlan.wisproPlanIdSingleContract = :single OR existingPlan.wisproPlanIdDoubleContract = :single OR existingPlan.wisproPlanIdSingleContract = :double OR existingPlan.wisproPlanIdDoubleContract = :double)',
          {
            single: nextSingle,
            double: nextDouble,
          },
        )
        .getOne();

      if (existing) {
        throw new ConflictException(
          'Ya existe un plan activo/no eliminado con alguno de los Wispro Plan IDs enviados',
        );
      }
    }

    if (updates.name !== undefined) {
      plan.name = updates.name;
    }

    if (updates.description !== undefined) {
      plan.description = updates.description;
    }

    if (updates.value !== undefined) {
      plan.value = updates.value;
    }

    if (updates.wisproPlanIdSingleContract !== undefined) {
      plan.wisproPlanIdSingleContract = updates.wisproPlanIdSingleContract;
    }

    if (updates.wisproPlanIdDoubleContract !== undefined) {
      plan.wisproPlanIdDoubleContract = updates.wisproPlanIdDoubleContract;
    }

    const updated = await this.planRepository.save(plan);
    this.logger.log(`Plan actualizado: ${id}`);
    return updated;
  }

  async deactivatePlan(id: string): Promise<void> {
    const plan = await this.planRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!plan) {
      throw new NotFoundException(`Plan con ID ${id} no encontrado`);
    }

    if (!plan.isActive) {
      return;
    }

    plan.isActive = false;
    await this.planRepository.save(plan);
    this.logger.log(`Plan desactivado: ${id}`);
  }

  async activatePlan(id: string): Promise<void> {
    const plan = await this.planRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!plan) {
      throw new NotFoundException(`Plan con ID ${id} no encontrado`);
    }

    if (plan.isActive) {
      return;
    }

    plan.isActive = true;
    await this.planRepository.save(plan);
    this.logger.log(`Plan activado: ${id}`);
  }

  async deletePlan(id: string): Promise<void> {
    const plan = await this.planRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!plan) {
      throw new NotFoundException(`Plan con ID ${id} no encontrado`);
    }

    plan.isDeleted = true;
    plan.isActive = false;
    await this.planRepository.save(plan);
    this.logger.log(`Plan eliminado (soft delete): ${id}`);
  }
}
