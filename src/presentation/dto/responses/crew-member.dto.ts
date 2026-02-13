/**
 * Crew Member DTO
 * 
 * DTO para representar un miembro de cuadrilla.
 */
export class CrewMemberDto {
  id: string;
  crewId: string;
  technicianId: string;
  role: string | null;
  createdAt: Date;
}


