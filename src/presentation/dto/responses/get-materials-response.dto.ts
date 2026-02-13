import { MaterialDto } from './material.dto';
import { PaginationDto } from './get-employees-response.dto';

export class GetMaterialsResponseDto {
  materials: MaterialDto[];
  pagination: PaginationDto;
}



