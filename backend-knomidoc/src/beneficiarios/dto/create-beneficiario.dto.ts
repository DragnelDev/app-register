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
import {
  ESTADOS_BENEFICIARIO,
  TIPOS_DOCUMENTO,
  TIPOS_PERSONA,
} from '../entities/beneficiario.entity';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreateBeneficiarioDto {
  @ApiPropertyOptional({ enum: TIPOS_PERSONA, default: 'NATURAL' })
  @IsOptional()
  @IsIn([...TIPOS_PERSONA])
  readonly tipoPersona?: string;

  @ApiProperty({ example: 'PROVEEDORA COMERCIAL ANDINA S.R.L.' })
  @IsNotEmpty({ message: 'El nombre o razón social es obligatorio' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Transform(trim)
  readonly nombre: string | undefined;

  @ApiPropertyOptional({ enum: TIPOS_DOCUMENTO, default: 'SIN_DOCUMENTO' })
  @IsOptional()
  @IsIn([...TIPOS_DOCUMENTO])
  readonly tipoDocumento?: string;

  @ApiPropertyOptional({ example: '1023456028' })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(30)
  @Matches(/^[A-Za-z0-9\-. ]+$/, {
    message: 'El documento solo admite letras, números, espacio, punto y guion',
  })
  @Transform(trim)
  readonly numeroDocumento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(30)
  @Transform(trim)
  readonly telefono?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(100)
  @Transform(trim)
  readonly email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(200)
  @Transform(trim)
  readonly direccion?: string;

  @ApiPropertyOptional({ enum: ESTADOS_BENEFICIARIO })
  @IsOptional()
  @IsIn([...ESTADOS_BENEFICIARIO])
  readonly estado?: string;
}
