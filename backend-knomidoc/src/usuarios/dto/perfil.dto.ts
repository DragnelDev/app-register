import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Datos que el propio usuario puede editar de su perfil. */
export class UpdatePerfilDto {
  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsOptional()
  @IsNotEmpty({ message: 'El nombre completo no puede quedar vacío' })
  @IsString()
  @MaxLength(150)
  @Transform(trim)
  readonly nombreCompleto?: string;

  @ApiPropertyOptional({ example: 'jperez@correo.com' })
  @IsOptional()
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(100)
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  readonly email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trim)
  readonly cargo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(trim)
  readonly unidadOArea?: string;

  @ApiPropertyOptional({ example: '+591 70000000' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[0-9+()\-\s]*$/, { message: 'El teléfono solo admite números, +, -, ( ) y espacios' })
  @Transform(trim)
  readonly telefono?: string;
}

export class CambiarPasswordDto {
  @ApiProperty()
  @IsNotEmpty({ message: 'Ingrese su contraseña actual' })
  @IsString()
  readonly passwordActual: string | undefined;

  @ApiProperty({ example: 'NuevaClave2026*' })
  @IsString()
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72)
  readonly passwordNueva: string | undefined;
}
