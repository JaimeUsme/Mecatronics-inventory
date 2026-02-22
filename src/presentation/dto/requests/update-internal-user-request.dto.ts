/**
 * Update Internal User Request DTO
 * 
 * DTO para actualizar un usuario interno (solo para administradores).
 * Permite actualizar nombre, email y contraseña.
 */
import { IsString, IsEmail, MinLength, MaxLength, IsOptional } from 'class-validator';

export class UpdateInternalUserRequestDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  /**
   * Job position or role within the organization (optional).
   */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  position?: string;

  /**
   * Identity document number (optional).
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  documentNumber?: string;

  /**
   * Nueva contraseña (opcional).
   * Si se proporciona, se hasheará antes de guardarse.
   */
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password?: string;
}


