export class PlanDto {
  id: string;
  name: string;
  description?: string | null;
  value: number;
  wisproPlanIdSingleContract: string;
  wisproPlanIdDoubleContract: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
