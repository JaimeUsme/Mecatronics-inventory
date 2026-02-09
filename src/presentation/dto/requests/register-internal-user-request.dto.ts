/**
 * Register Internal User Request DTO
 *
 * DTO para registrar un usuario interno (no Wispro).
 * Opcionalmente puede incluir credenciales de Wispro para vincular la cuenta.
 */
import { IsString, IsEmail, MinLength, MaxLength, IsOptional } from 'class-validator';

export class RegisterInternalUserRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;

  /**
   * Email de Wispro (opcional). Si se envía junto con wisproPassword,
   * el sistema intentará vincular y loguear Wispro automáticamente.
   */
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  wisproEmail?: string;

  /**
   * Password de Wispro (opcional). Se cifrará antes de guardarse.
   */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  wisproPassword?: string;
}


