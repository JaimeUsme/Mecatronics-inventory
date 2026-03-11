import { IsString, MaxLength, IsOptional, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdatePlanRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  wisproPlanIdSingleContract?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  wisproPlanIdDoubleContract?: string;
}
