/**
 * Material Expense Feedback DTO
 * 
 * DTO que representa un feedback de gasto de material completo,
 * incluyendo el feedback y los materiales parseados del body.
 */
import { OrderFeedbackDto } from './order-feedback.dto';
import { MaterialExpenseDto } from './material-expense.dto';

export class MaterialExpenseFeedbackDto {
  /**
   * Información del feedback (id, created_at, etc.)
   */
  feedback: OrderFeedbackDto;

  /**
   * Array de materiales parseados del body del feedback
   */
  materials: MaterialExpenseDto[];
}

