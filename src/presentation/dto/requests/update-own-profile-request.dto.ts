/**
 * Update Own Profile Request DTO
 * 
 * DTO para que un usuario actualice su propio perfil.
 * Solo permite actualizar email y contraseña, NO el nombre.
 */
import { IsString, IsEmail, MinLength, MaxLength, IsOptional } from 'class-validator';

export class UpdateOwnProfileRequestDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

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

