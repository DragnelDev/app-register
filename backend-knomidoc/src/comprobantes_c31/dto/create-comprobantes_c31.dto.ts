import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export const TIPOS_C31 = ['CON_IMPUTACION', 'SIN_IMPUTACION'] as const;

/** Letras (con tildes), números, espacios y . / - _ (N° de preventivo, devengado, folio). */
export const CODIGO_REGEX = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ .\/\-_]+$/;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Convierte '' en undefined para que el campo opcional se ignore. */
const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreateComprobantesC31Dto {
  @ApiPropertyOptional({
    enum: TIPOS_C31,
    default: 'CON_IMPUTACION',
    description: 'Tipo de C31',
  })
  @IsOptional()
  @IsIn([...TIPOS_C31], {
    message: `El tipo de C31 debe ser uno de: ${TIPOS_C31.join(', ')}`,
  })
  readonly tipoC31?: string;

  @ApiPropertyOptional({
    example: 15340.5,
    description:
      'Monto total del documento (incluye impuestos, retenciones, etc.). Los pagos a cada beneficiario se registran aparte. Opcional al registrar.',
  })
  @IsOptional()
  @Transform(vacioAUndefined)
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El monto admite hasta 2 decimales' },
  )
  @IsPositive({ message: 'El monto total debe ser mayor a 0' })
  @Max(999999999999.99, { message: 'El monto total es demasiado grande' })
  readonly montoTotal?: number;

  @ApiPropertyOptional({ example: '2026-07-15' })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsDateString(
    {},
    { message: 'La fecha de elaboración debe ser una fecha válida' },
  )
  readonly fechaElaboracion?: string;

  @ApiPropertyOptional({ example: 'Pago de servicios básicos - gestión 2026' })
  @IsOptional()
  @Transform(({ value }): unknown =>
    vacioAUndefined({ value: trim({ value }) }),
  )
  @IsString()
  @MinLength(5, { message: 'La descripción es demasiado corta' })
  @MaxLength(2000, {
    message: 'La descripción no debe superar los 2000 caracteres',
  })
  readonly descripcion?: string;

  @ApiPropertyOptional({ example: '102', description: 'Folio individual' })
  @IsOptional()
  @Matches(CODIGO_REGEX, {
    message: 'El folio solo admite letras, números, espacios y . / - _',
  })
  @Transform(({ value }): unknown => {
    const v = vacioAUndefined({ value });
    return typeof v === 'number' ? String(v) : v;
  })
  @IsString()
  @MaxLength(50)
  readonly numeroFolio?: string;

  @ApiPropertyOptional({
    example: 2026,
    description:
      'Gestión (año) a la que pertenece el comprobante. Si no se indica, se calcula del año de la fecha de elaboración.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly gestion?: number;

  @ApiPropertyOptional({
    example: 'Estante 3 - Carpeta CARP-2026-001',
    description:
      'Ubicación física del comprobante (no obligatoria al registrar)',
  })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(150)
  readonly ubicacionFisica?: string;

  @ApiPropertyOptional({
    example: 'Hoja 2 con humedad',
    description: 'Detalles del estado físico del comprobante',
  })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  readonly observaciones?: string;

  @ApiPropertyOptional({
    example: 'PREV-2026-0001',
    description:
      'Identificador oficial cuando tipoC31 = CON_IMPUTACION. Obligatorio en ' +
      'ese caso y no debe enviarse junto con numeroDevengado (relación 1 a 1 ' +
      'estricta: un comprobante solo tiene preventivo o devengado, no ambos). ' +
      'Soporta "2 en 1" como texto libre en un mismo campo (ej. "0012 / 0013").',
  })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(50)
  @Matches(CODIGO_REGEX, {
    message:
      'El N° de preventivo solo admite letras, números, espacios y . / - _',
  })
  readonly numeroPreventivo?: string;

  @ApiPropertyOptional({
    example: 'DEV-2026-0001',
    description:
      'Identificador oficial cuando tipoC31 = SIN_IMPUTACION. Obligatorio en ' +
      'ese caso y no debe enviarse junto con numeroPreventivo (relación 1 a 1 ' +
      'estricta: un comprobante solo tiene preventivo o devengado, no ambos). ' +
      'Soporta "2 en 1" como texto libre en un mismo campo (ej. "0012 / 0013").',
  })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(50)
  @Matches(CODIGO_REGEX, {
    message:
      'El N° de devengado solo admite letras, números, espacios y . / - _',
  })
  readonly numeroDevengado?: string;

  @ApiPropertyOptional({ type: [String], example: ['Juan Pérez'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30, { message: 'No se admiten más de 30 beneficiarios' })
  @IsString({ each: true })
  @MinLength(2, {
    each: true,
    message: 'Cada beneficiario debe tener al menos 2 caracteres',
  })
  @MaxLength(200, {
    each: true,
    message: 'Un beneficiario no debe superar los 200 caracteres',
  })
  // Sin valor por defecto: UpdateComprobantesC31Dto hereda este campo vía
  // PartialType y un `= []` haría que todo PATCH pareciera enviar una lista
  // vacía de beneficiarios (rechazando cualquier edición parcial).
  readonly beneficiarios?: string[];
}
