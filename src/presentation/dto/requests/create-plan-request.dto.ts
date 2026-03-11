import { IsString, IsNotEmpty, MaxLength, IsOptional, IsNumber, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreatePlanRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  value: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  wisproPlanIdSingleContract: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  wisproPlanIdDoubleContract: string;
}
