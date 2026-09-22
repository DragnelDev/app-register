import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
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
  @Type(() => Number)
  @IsInt({ each: true })
  readonly comprobanteIds: number[] = [];

  @ApiProperty({ example: 'NOTA-AUD-045/2026' })
  @IsNotEmpty({ message: 'El número de nota de solicitud es obligatorio' })
  @IsString()
  @MaxLength(100)
  @Transform(trim)
  readonly numeroNotaSolicitud: string | undefined;

  @ApiProperty({ example: 'Auditoría Interna' })
  @IsNotEmpty({ message: 'La institución solicitante es obligatoria' })
  @IsString()
  @MaxLength(150)
  @Transform(trim)
  readonly institucionSolicitante: string | undefined;

  @ApiProperty({ example: 'Lic. Pedro Gómez' })
  @IsNotEmpty({ message: 'El funcionario responsable es obligatorio' })
  @IsString()
  @MaxLength(150)
  @Transform(trim)
  readonly funcionarioResponsable: string | undefined;

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
  readonly observaciones?: string;
}
