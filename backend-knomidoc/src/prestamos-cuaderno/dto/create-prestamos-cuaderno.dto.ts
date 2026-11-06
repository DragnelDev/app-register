import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const METODOS_VERIFICACION = ['FIRMA_MANUAL', 'HUELLA_DIGITAL'] as const;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreatePrestamosCuadernoDto {
  @ApiProperty({
    type: [Number],
    example: [10, 11],
    description:
      'Comprobantes C31 que salen del archivo. Se registra una salida por cada comprobante.',
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Debe indicar al menos un comprobante a prestar' })
  @ArrayMaxSize(100, {
    message: 'No se pueden prestar más de 100 comprobantes a la vez',
  })
  @Type(() => Number)
  @IsInt({ each: true })
  readonly comprobanteIds: number[] = [];

  @ApiProperty({
    example: 7,
    description: 'ID del funcionario (directorio) que solicita el comprobante',
  })
  @Type(() => Number)
  @IsInt({ message: 'Seleccione el funcionario solicitante' })
  readonly funcionarioId: number | undefined;

  @ApiPropertyOptional({
    example: 'Auditoría Interna',
    description:
      'Área/unidad del solicitante. Si no se indica se usa la unidad registrada del funcionario.',
  })
  @IsOptional()
  @Transform(({ value }): unknown =>
    vacioAUndefined({ value: trim({ value }) }),
  )
  @IsString()
  @MaxLength(150)
  readonly areaUnidad?: string;

  @ApiPropertyOptional({
    example: '2026-07-25',
    description: 'Fecha en que se espera la devolución',
  })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsDateString(
    {},
    { message: 'La fecha de devolución estimada debe ser válida' },
  )
  readonly fechaDevolucionEstimada?: string;

  @ApiPropertyOptional({
    example: '2026-07-20T09:30:00',
    description: 'Si no se indica, se usa la fecha y hora actuales',
  })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsDateString({}, { message: 'La fecha y hora de salida deben ser válidas' })
  readonly fechaHoraSalida?: string;

  @ApiPropertyOptional({
    enum: METODOS_VERIFICACION,
    default: 'FIRMA_MANUAL',
  })
  @IsOptional()
  @IsIn([...METODOS_VERIFICACION])
  readonly metodoVerificacion?: string;

  @ApiPropertyOptional({ description: 'Log biométrico o firma (futuro)' })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(500)
  readonly evidenciaVerificacionUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(1000)
  readonly observaciones?: string;
}
