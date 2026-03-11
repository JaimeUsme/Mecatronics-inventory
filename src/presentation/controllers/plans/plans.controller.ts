import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PlansService } from '@application/services/plans';
import {
  CreatePlanRequestDto,
  GetPlansRequestDto,
  UpdatePlanRequestDto,
  GetPlansResponseDto,
  PlanDto,
  WisproPublicPlanDto,
} from '@presentation/dto';
import { GetWisproPublicPlansUseCase } from '@application/use-cases/plans';

@Controller('plans')
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
    private readonly getWisproPublicPlansUseCase: GetWisproPublicPlansUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getPlans(
    @Query() query: GetPlansRequestDto,
  ): Promise<GetPlansResponseDto> {
    const perPage = query.per_page || 20;
    const page = query.page || 1;
    const search = query.search?.trim() || undefined;
    const active = query.active;

    const { plans, total, stats } = await this.plansService.getPlansPaginated(
      page,
      perPage,
      search,
      active,
    );

    const totalPages = Math.ceil(total / perPage) || 1;

    return {
      plans: plans.map((plan) => this.toDto(plan)),
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: totalPages,
      },
      stats,
    };
  }

  @Get('wispro')
  @HttpCode(HttpStatus.OK)
  async getWisproPublicPlans(
    @Query() query?: { page?: number; per_page?: number },
  ): Promise<WisproPublicPlanDto[]> {
    return this.getWisproPublicPlansUseCase.execute(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPlan(@Body() dto: CreatePlanRequestDto): Promise<PlanDto> {
    const plan = await this.plansService.createPlan(
      dto.name,
      dto.description ?? null,
      dto.value,
      dto.wisproPlanIdSingleContract,
      dto.wisproPlanIdDoubleContract,
    );

    return this.toDto(plan);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdatePlanRequestDto,
  ): Promise<PlanDto> {
    const plan = await this.plansService.updatePlan(id, {
      name: dto.name,
      description: dto.description,
      value: dto.value,
      wisproPlanIdSingleContract: dto.wisproPlanIdSingleContract,
      wisproPlanIdDoubleContract: dto.wisproPlanIdDoubleContract,
    });

    return this.toDto(plan);
  }

  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivatePlan(@Param('id') id: string): Promise<void> {
    await this.plansService.deactivatePlan(id);
  }

  @Patch(':id/activate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async activatePlan(@Param('id') id: string): Promise<void> {
    await this.plansService.activatePlan(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePlan(@Param('id') id: string): Promise<void> {
    await this.plansService.deletePlan(id);
  }

  private toDto(plan: any): PlanDto {
    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      value: Number(plan.value),
      wisproPlanIdSingleContract: plan.wisproPlanIdSingleContract,
      wisproPlanIdDoubleContract: plan.wisproPlanIdDoubleContract,
      isActive: plan.isActive,
      isDeleted: plan.isDeleted,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }
}
