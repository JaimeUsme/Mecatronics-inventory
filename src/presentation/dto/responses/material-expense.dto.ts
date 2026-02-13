/**
 * Material Expense DTO
 * 
 * DTO que representa un material individual dentro de un gasto de material.
 * Este DTO parsea el JSON del body del feedback de material.
 */
export class MaterialExpenseDto {
  /**
   * ID del material en el inventario de Wispro
   */
  id: string;

  /**
   * Nombre o descripción del material
   */
  name: string;

  /**
   * Cantidad utilizada/gastada (normalmente)
   */
  quantityUsed: number;

  /**
   * Cantidad dañada/rota
   */
  quantityDamaged: number;

  /**
   * Unidad de medida (opcional)
   */
  unit?: string;

  /**
   * Cualquier otro campo adicional del material
   */
  [key: string]: any;
}

