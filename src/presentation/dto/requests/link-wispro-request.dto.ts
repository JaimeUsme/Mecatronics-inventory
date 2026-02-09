/**
 * Link Wispro Account Request DTO
 *
 * DTO para vincular una cuenta de Wispro a un usuario interno existente.
 * El usuario interno se obtiene desde el JWT; aquí solo se envían
 * las credenciales de Wispro.
 */
import { IsString, IsEmail, MaxLength } from 'class-validator';

export class LinkWisproRequestDto {
  /**
   * Email de la cuenta de Wispro a vincular.
   */
  @IsEmail()
  @MaxLength(255)
  wisproEmail: string;

  /**
   * Password de la cuenta de Wispro a vincular.
   */
  @IsString()
  @MaxLength(128)
  wisproPassword: string;
}


