import { PaginationDto } from './get-employees-response.dto';
import { PlanDto } from './plan.dto';

export class PlansStatsDto {
  total: number;
  active: number;
  inactive: number;
}

export class GetPlansResponseDto {
  plans: PlanDto[];
  pagination: PaginationDto;
  stats: PlansStatsDto;
}
