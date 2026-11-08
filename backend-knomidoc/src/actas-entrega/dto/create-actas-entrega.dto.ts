import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateActasEntregaDto {
  @ApiPropertyOptional({
    example: 'AE-2026-001',
    description: 'Si se omite, el sistema asigna el siguiente N° de la gestión',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ .\/\-_]+$/, {
    message: 'El N° de acta solo admite letras, números, espacios y . / - _',
  })
  @Transform(trim)
  readonly numeroActa?: string;

  @ApiPropertyOptional({ example: 'Tesorería', default: 'Tesorería' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trim)
  readonly unidadEmisora?: string;

  @ApiProperty({ example: 'Lic. María Rojas (Tesorería)' })
  @IsNotEmpty({ message: 'El responsable de entrega es obligatorio' })
  @IsString()
  @MinLength(3, { message: 'Indique el nombre completo' })
  @MaxLength(150)
  @Transform(trim)
  readonly responsableEntrega?: string;

  @ApiPropertyOptional({
    example: 'Ana Rodríguez (Archivo Central)',
    description:
      'Si se omite queda "Archivo Central" hasta que Archivo reciba el acta',
  })
  @IsOptional()
  @IsNotEmpty({ message: 'Indique el responsable de recepción' })
  @IsString()
  @MinLength(3, { message: 'Indique el nombre completo' })
  @MaxLength(150)
  @Transform(trim)
  readonly responsableRecepcion?: string;

  @ApiProperty({ example: '2026-07-20' })
  @IsNotEmpty({ message: 'La fecha de recepción es obligatoria' })
  @IsDateString(
    {},
    { message: 'La fecha de recepción debe ser una fecha válida' },
  )
  readonly fechaRecepcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trim)
  readonly observaciones?: string;

  @ApiPropertyOptional({
    type: [Number],
    example: [12, 15],
    description:
      'Comprobantes ya registrados (En revisión / firmados) que se entregan en esta acta',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(300, { message: 'Un acta admite hasta 300 comprobantes' })
  @Type(() => Number)
  @IsInt({ each: true })
  readonly comprobanteIds?: number[];
}
