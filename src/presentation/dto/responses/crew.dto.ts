/**
 * Crew DTO
 * 
 * DTO para representar una cuadrilla con sus miembros.
 */
import { CrewMemberDto } from './crew-member.dto';

export class CrewDto {
  id: string;
  name: string;
  leaderTechnicianId: string | null;
  description: string | null;
  active: boolean;
  createdAt: Date;
  members: CrewMemberDto[];
}


