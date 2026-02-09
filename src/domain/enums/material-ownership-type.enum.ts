/**
 * Material Ownership Type Enum
 *
 * Indica a qué nivel se controla el stock principal de un material.
 * - TECHNICIAN: materiales asignados a técnicos individuales (equipos, ONT, herramientas, etc.)
 * - CREW: materiales controlados a nivel de cuadrilla (cable coaxial, UTP en rollo, etc.)
 */
export enum MaterialOwnershipType {
  TECHNICIAN = 'TECHNICIAN',
  CREW = 'CREW',
}


