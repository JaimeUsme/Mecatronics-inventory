/**
 * Location Type Enum
 * 
 * Define los tipos de ubicaciones disponibles en el sistema de inventario.
 */
export enum LocationType {
  /**
   * Bodega central
   */
  WAREHOUSE = 'WAREHOUSE',

  /**
   * Inventario de un técnico
   */
  TECHNICIAN = 'TECHNICIAN',

  /**
   * Inventario de una cuadrilla (equipo de técnicos).
   * Útil para materiales compartidos como cables en rollo.
   */
  CREW = 'CREW',
}

