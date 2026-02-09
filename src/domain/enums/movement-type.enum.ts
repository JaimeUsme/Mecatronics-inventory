/**
 * Movement Type Enum
 * 
 * Define los tipos de movimientos de inventario.
 */
export enum MovementType {
  /**
   * Transferencia de material entre ubicaciones (ej: bodega -> técnico)
   */
  TRANSFER = 'TRANSFER',

  /**
   * Consumo de material en una orden de servicio
   */
  CONSUMPTION = 'CONSUMPTION',

  /**
   * Ajuste manual de inventario (correcciones, inventarios físicos)
   */
  ADJUSTMENT = 'ADJUSTMENT',

  /**
   * Material dañado durante transferencia o manipulación
   * El material sale del origen pero no llega al destino (se pierde)
   */
  DAMAGED = 'DAMAGED',
}

