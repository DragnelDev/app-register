import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

/** Contraseña: 8 a 72 caracteres con al menos una letra y un número. */
export const REGEX_PASSWORD = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
export const MSG_PASSWORD =
  'La contraseña debe tener entre 8 y 72 caracteres, con al menos una letra y un número';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class VerificarEmailDto {
  @ApiProperty({
    example: '482913',
    description: 'Código de 6 dígitos recibido por correo',
  })
  @Transform(trim)
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  readonly codigo: string | undefined;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'usuario@knomidoc.com' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(100)
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  readonly email: string | undefined;

  @ApiProperty({ example: '482913' })
  @Transform(trim)
  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  readonly codigo: string | undefined;

  @ApiProperty({ example: 'NuevaClave2026*' })
  @IsString()
  @Matches(REGEX_PASSWORD, { message: MSG_PASSWORD })
  readonly password: string | undefined;
}
