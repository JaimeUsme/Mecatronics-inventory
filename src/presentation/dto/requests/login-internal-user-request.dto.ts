/**
 * Login Internal User Request DTO
 *
 * DTO para login interno (no Wispro).
 */
import { IsString, IsEmail, MaxLength } from 'class-validator';

export class LoginInternalUserRequestDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MaxLength(128)
  password: string;
}



