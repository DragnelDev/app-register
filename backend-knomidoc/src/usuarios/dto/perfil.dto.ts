import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ValidateIf,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MSG_PASSWORD, REGEX_PASSWORD } from '../../auth/dto/codigo.dto';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** URL http(s) o imagen en data URL (la reduce el navegador; ≤ ~65 KB). */
const REGEX_FOTO =
  /^(https?:\/\/\S{4,480}|data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]{1,90000})$/;

/** Datos que el propio usuario puede editar de su perfil. */
export class UpdatePerfilDto {
  @ApiPropertyOptional({ example: 'Juan Pérez' })
  @IsOptional()
  @IsNotEmpty({ message: 'El nombre completo no puede quedar vacío' })
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(150)
  @Matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ .,'()\-]+$/, {
    message: "El nombre solo admite letras, espacios y . , ' ( ) -",
  })
  @Transform(trim)
  readonly nombreCompleto?: string;

  @ApiPropertyOptional({
    description: 'URL o data URL de la foto; "" la quita',
  })
  @IsOptional()
  @ValidateIf((_o, v) => v !== '' && v !== null)
  @IsString()
  @Matches(REGEX_FOTO, {
    message:
      'La foto debe ser una URL http(s) o una imagen PNG/JPG/WEBP pequeña',
  })
  readonly foto?: string | null;

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
  @Matches(/^[0-9+()\-\s]*$/, {
    message: 'El teléfono solo admite números, +, -, ( ) y espacios',
  })
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
  @Matches(REGEX_PASSWORD, { message: MSG_PASSWORD })
  readonly passwordNueva: string | undefined;
}
