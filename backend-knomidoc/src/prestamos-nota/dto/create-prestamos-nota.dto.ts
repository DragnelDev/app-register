import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreatePrestamosNotaDto {
  @ApiProperty({
    type: [Number],
    example: [12, 13],
    description:
      'Comprobantes C31 a prestar. Se registra un préstamo por cada comprobante.',
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Debe indicar al menos un comprobante a prestar' })
  @ArrayMaxSize(100, {
    message: 'No se pueden prestar más de 100 comprobantes en una nota',
  })
  @Type(() => Number)
  @IsInt({ each: true })
  readonly comprobanteIds: number[] = [];

  @ApiPropertyOptional({
    example: 'NP-0012/2026',
    description:
      'N° de nota / CITE. Si se omite, el sistema lo genera (NP-0001/año)',
  })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(100)
  @Matches(/^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ .\/\-_]+$/, {
    message: 'El N° de nota solo admite letras, números, espacios y . / - _',
  })
  @Transform(trim)
  readonly numeroNotaSolicitud: string | undefined;

  @ApiProperty({
    example: 7,
    description: 'Funcionario del directorio que solicita y recibe',
  })
  @Type(() => Number)
  @IsInt({ message: 'Seleccione el funcionario solicitante' })
  readonly funcionarioId: number | undefined;

  @ApiPropertyOptional({
    example: 'Auditoría Interna',
    description:
      'Unidad/institución solicitante. Si no se indica se usa la unidad del funcionario.',
  })
  @IsOptional()
  @Transform(({ value }): unknown =>
    vacioAUndefined({ value: trim({ value }) }),
  )
  @IsString()
  @MaxLength(150)
  readonly institucionSolicitante?: string;

  @ApiPropertyOptional({
    description: 'Referencia / glosa de la nota (texto de la línea REF.)',
  })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(500)
  readonly referencia?: string;

  @ApiPropertyOptional({
    description: 'Destinatario impreso. Si no se indica, el funcionario.',
  })
  @IsOptional()
  @Transform(({ value }): unknown =>
    vacioAUndefined({ value: trim({ value }) }),
  )
  @IsString()
  @MaxLength(200)
  readonly destinatario?: string;

  @ApiPropertyOptional({
    example: '2026-07-20',
    description: 'Si no se indica, se usa la fecha de hoy',
  })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsDateString({}, { message: 'La fecha de préstamo debe ser válida' })
  readonly fechaPrestamo?: string;

  @ApiPropertyOptional({ example: '2026-08-20' })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsDateString(
    {},
    { message: 'La fecha de devolución estimada debe ser válida' },
  )
  readonly fechaDevolucionEstimada?: string;

  @ApiPropertyOptional({ example: 'Se entrega con 3 carpetas' })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(1000)
  readonly observaciones?: string;

  @ApiPropertyOptional({
    default: false,
    description:
      'false = guarda como BORRADOR (editable, el comprobante no sale). true = aprueba y entrega de inmediato.',
  })
  @IsOptional()
  @Transform(({ value }): unknown => value === true || value === 'true')
  @IsBoolean()
  readonly aprobar?: boolean;
}
