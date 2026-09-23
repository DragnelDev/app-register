import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { ArrayNotEmpty } from 'class-validator';

export const TIPOS_C31 = ['CON_IMPUTACION', 'SIN_IMPUTACION'] as const;

/**
 * Estados físicos que se pueden fijar manualmente al registrar/editar un
 * comprobante. EN_ARCHIVO también se fija automáticamente al vincular un
 * acta de entrega; PRESTADO lo gestiona exclusivamente el módulo de
 * préstamos y no se admite aquí.
 */
export const ESTADOS_FISICO_EDITABLES = [
  'EN_TRAMITE',
  'EN_ARCHIVO',
  'ANULADO',
] as const;

/** Convierte '' en undefined para que el campo opcional se ignore. */
const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreateComprobantesC31Dto {
  @ApiPropertyOptional({
    example: 3,
    description: 'ID del acta de entrega (lote de ingreso) asociada',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly actaEntregaId?: number;

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

  @ApiPropertyOptional({ example: '00123' })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(50)
  readonly numeroComprobante?: string;

  @ApiProperty({ example: 15340.5 })
  @IsNotEmpty({ message: 'El monto total es obligatorio' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'El monto total debe ser mayor a 0' })
  readonly montoTotal: number | undefined;

  @ApiProperty({ example: '2026-07-15' })
  @IsNotEmpty({ message: 'La fecha de elaboración es obligatoria' })
  @IsDateString(
    {},
    { message: 'La fecha de elaboración debe ser una fecha válida' },
  )
  readonly fechaElaboracion: string | undefined;

  @ApiProperty({ example: 'Pago de servicios básicos - gestión 2026' })
  @IsNotEmpty({ message: 'La descripción/glosa es obligatoria' })
  @IsString()
  readonly descripcion: string | undefined;

  @ApiPropertyOptional({ example: '102', description: 'Folio individual' })
  @IsOptional()
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
    enum: ESTADOS_FISICO_EDITABLES,
    default: 'EN_TRAMITE',
    description:
      'Estado físico inicial del comprobante (editable). Si no se indica, ' +
      'queda en "En Trámite / Revisión"; salvo que se registre ya vinculado ' +
      'a un acta de entrega (actaEntregaId), en cuyo caso el sistema lo fija ' +
      'automáticamente en "En archivo".',
  })
  @IsOptional()
  @IsIn([...ESTADOS_FISICO_EDITABLES], {
    message: `El estado físico solo puede fijarse a: ${ESTADOS_FISICO_EDITABLES.join(', ')}`,
  })
  readonly estadoFisico?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['PREV-2026-0001'],
    description:
      'Soporta preventivos "2 en 1". Se exige al menos un preventivo o un devengado.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly preventivos?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['DEV-2026-0001'],
    description:
      'Soporta devengados "2 en 1". Se exige al menos un preventivo o un devengado.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly devengados?: string[];

  @ApiProperty({ type: [String], example: ['Juan Pérez'] })
  @IsArray()
  @ArrayNotEmpty({ message: 'Debe registrar al menos un beneficiario' })
  @IsString({ each: true })
  readonly beneficiarios: string[] = [];

  @ApiPropertyOptional({ type: [String], example: [], description: 'Opcional' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly cheques?: string[];
}
