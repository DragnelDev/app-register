import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ROLES_USUARIO } from '../../common/constants/roles.constant';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateUsuarioDto {
  @ApiProperty({ type: String, example: 'jperez' })
  @IsNotEmpty({ message: 'El campo username es obligatorio' })
  @IsString({ message: 'El campo username debe ser de tipo cadena' })
  @MinLength(3, { message: 'El username debe tener al menos 3 caracteres' })
  @MaxLength(50, {
    message: 'El campo username no debe ser mayor a 50 caracteres',
  })
  @Matches(/^[a-z0-9._-]+$/, {
    message:
      'El username solo puede contener minúsculas, números, punto, guion y guion bajo',
  })
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  readonly username: string | undefined;

  @ApiProperty({ type: String, example: 'Juan Perez' })
  @IsNotEmpty({ message: 'El campo nombre completo es obligatorio' })
  @IsString({ message: 'El campo nombre completo debe ser de tipo cadena' })
  @MaxLength(150, {
    message: 'El campo nombre completo no debe ser mayor a 150 caracteres',
  })
  @Transform(trim)
  readonly nombreCompleto: string | undefined;

  @ApiProperty({ type: String, example: 'jperez@gmail.com' })
  @IsNotEmpty({ message: 'El campo email es obligatorio' })
  @IsEmail({}, { message: 'El campo email debe ser un correo válido' })
  @MaxLength(100, {
    message: 'El campo email no debe ser mayor a 100 caracteres',
  })
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  readonly email: string | undefined;

  @ApiPropertyOptional({ type: String, example: 'Técnico de Archivos' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trim)
  readonly cargo?: string;

  @ApiPropertyOptional({ type: String, example: 'Unidad de Archivo Central' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(trim)
  readonly unidadOArea?: string;

  @ApiPropertyOptional({
    type: String,
    example: 'Clave123',
    description:
      'Contraseña en texto plano (se guarda como hash). Si no se envía, se usa la clave por defecto del sistema.',
  })
  @IsOptional()
  @IsString({ message: 'El campo contraseña debe ser de tipo cadena' })
  @MinLength(6, {
    message: 'La contraseña debe tener al menos 6 caracteres',
  })
  readonly password?: string;

  @ApiProperty({ type: String, example: 'ADMIN', enum: ROLES_USUARIO })
  @IsNotEmpty({ message: 'El campo rol es obligatorio' })
  @IsIn([...ROLES_USUARIO], {
    message: `El campo rol debe ser uno de: ${ROLES_USUARIO.join(', ')}`,
  })
  readonly rol: string | undefined;
}
