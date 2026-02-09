/**
 * Employee Mapper
 * 
 * Mapper que transforma la respuesta de la API de Wispro
 * a nuestro DTO de empleado con solo los campos solicitados.
 */
import { EmployeeDto, RoleDto } from '@presentation/dto';

/**
 * Interfaz que representa la estructura de un empleado en la respuesta de Wispro
 */
interface WisproRole {
  id?: string;
  name?: string;
  resource_id?: string | null;
  resource_type?: string | null;
}

interface WisproUser {
  id?: string;
  email?: string;
  active?: boolean;
  roles?: WisproRole[];
  [key: string]: any;
}

interface WisproEmployee {
  id?: string;
  public_id?: string;
  name?: string;
  email?: string;
  phone_mobile?: string;
  user?: WisproUser;
  userable?: {
    id?: string;
    name?: string;
    phone_mobile?: string;
  };
  [key: string]: any; // Para campos adicionales que puedan venir
}

/**
 * Mapea un empleado de la API de Wispro a nuestro DTO
 * @param wisproEmployee - Empleado de la respuesta de Wispro
 * @returns Empleado mapeado con solo los campos solicitados
 */
/**
 * Mapea un rol de Wispro a nuestro DTO
 */
function mapWisproRoleToDto(wisproRole: WisproRole): RoleDto {
  return {
    id: wisproRole.id || '',
    name: wisproRole.name || '',
    resource_id: wisproRole.resource_id || null,
    resource_type: wisproRole.resource_type || null,
  };
}

export function mapWisproEmployeeToDto(wisproEmployee: WisproEmployee): EmployeeDto {
  // Extraer email del objeto user (según la estructura real de Wispro)
  const email = wisproEmployee.user?.email || wisproEmployee.email || '';
  
  // Extraer public_id (puede no estar presente, usar id como fallback)
  const publicId = wisproEmployee.public_id || wisproEmployee.id || '';
  
  // Extraer roles del objeto user
  const roles: RoleDto[] = (wisproEmployee.user?.roles || []).map(mapWisproRoleToDto);

  // Extraer estado activo del usuario
  const active = wisproEmployee.user?.active ?? false;
  
  // Extraer los campos necesarios según la estructura real de Wispro
  const employee: EmployeeDto = {
    public_id: publicId,
    name: wisproEmployee.name || wisproEmployee.userable?.name || '',
    email: email,
    id: wisproEmployee.id || wisproEmployee.userable?.id || wisproEmployee.user?.id || '',
    phone_mobile: wisproEmployee.phone_mobile || wisproEmployee.userable?.phone_mobile || '',
    active,
    roles: roles,
  };

  return employee;
}

/**
 * Mapea un array de empleados de la API de Wispro a nuestro DTO
 * @param wisproEmployees - Array de empleados de la respuesta de Wispro
 * @returns Array de empleados mapeados
 */
export function mapWisproEmployeesToDto(wisproEmployees: WisproEmployee[]): EmployeeDto[] {
  return wisproEmployees.map(mapWisproEmployeeToDto);
}

