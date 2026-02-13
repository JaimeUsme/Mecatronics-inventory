/**
 * Reconfigure Crews Request DTO
 * 
 * DTO para reconfigurar cuadrillas y mover material automáticamente.
 */
import { IsArray, IsString, IsNotEmpty, IsOptional, IsBoolean, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class NewCrewConfigDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  leaderTechnicianId: string;

  @IsArray()
  @ArrayMinSize(0)
  @IsString({ each: true })
  technicianIds: string[];
}

export class LeaderResolutionDto {
  @IsString()
  @IsNotEmpty()
  newCrewId: string; // ID temporal del frontend

  @IsString()
  @IsNotEmpty()
  selectedLeaderId: string;

  @IsArray()
  @IsString({ each: true })
  conflictingLeaders: string[];
}

export class ReconfigureCrewsRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  oldCrewIds: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => NewCrewConfigDto)
  newCrews: NewCrewConfigDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeaderResolutionDto)
  leaderResolutions?: LeaderResolutionDto[];

  @IsOptional()
  @IsBoolean()
  deactivateOldCrews?: boolean;
}


