/**
 * Create Material Expense Request DTO
 * 
 * DTO para crear un gasto de material en una orden.
 * Los materiales se envían en un formato amigable y se convierten a JSON en el backend.
 */
export class CreateMaterialExpenseRequestDto {
  /**
   * Array de materiales utilizados
   */
  materials: Array<{
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
     * Cualquier otro campo adicional
     */
    [key: string]: any;
  }>;

  /**
   * Locale (idioma)
   */
  locale?: string;
}

