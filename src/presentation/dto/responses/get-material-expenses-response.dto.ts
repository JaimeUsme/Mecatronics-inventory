/**
 * Get Material Expenses Response DTO
 * 
 * DTO que define la estructura de la respuesta del endpoint de gastos de material.
 * Devuelve una lista plana de materiales (sin agrupar por feedback).
 */
import { MaterialExpenseDto } from './material-expense.dto';

export class GetMaterialExpensesResponseDto {
  /**
   * Array plano de materiales gastados (todos los materiales de todos los feedbacks)
   */
  materials: MaterialExpenseDto[];
}

