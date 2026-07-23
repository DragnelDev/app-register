import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const ROLES = ['ADMIN', 'REGISTRADOR', 'CONSULTA'];

export class CreateUsuarioDto {
  @ApiProperty({ type: String, example: 'Juan Perez' })
  @IsNotEmpty({ message: 'El campo nombre completo es obligatorio' })
  @IsString({ message: 'El campo nombre completo debe ser de tipo cadena' })
  @MaxLength(150, {
    message: 'El campo nombre completo no debe ser mayor a 150 caracteres',
  })
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : value,
  )
  readonly nombreCompleto: string | undefined;

  @ApiProperty({ type: String, example: 'jperez@gmail.com' })
  @IsNotEmpty({ message: 'El campo email es obligatorio' })
  @IsEmail({}, { message: 'El campo email debe ser un correo válido' })
  @MaxLength(100, {
    message: 'El campo email no debe ser mayor a 100 caracteres',
  })
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  readonly email: string | undefined;

  @ApiPropertyOptional({
    type: String,
    example: 'Clave123',
    description:
      'Contraseña en texto plano. Si no se envía, se usa la clave por defecto del sistema.',
  })
  @IsOptional()
  @IsString({ message: 'El campo contraseña debe ser de tipo cadena' })
  @MinLength(6, {
    message: 'La contraseña debe tener al menos 6 caracteres',
  })
  readonly passwordHash?: string;

  @ApiProperty({ type: String, example: 'ADMIN', enum: ROLES })
  @IsNotEmpty({ message: 'El campo rol es obligatorio' })
  @IsIn(ROLES, { message: `El campo rol debe ser uno de: ${ROLES.join(', ')}` })
  readonly rol: string | undefined;
}
