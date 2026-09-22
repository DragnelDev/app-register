import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
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
  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  readonly comprobanteId: number | undefined;

  @ApiProperty({
    example: 4,
    description: 'ID del usuario que solicita el comprobante',
  })
  @Type(() => Number)
  @IsInt()
  readonly solicitanteId: number | undefined;

  @ApiPropertyOptional({
    example: 'Auditoría Interna',
    description:
      'Área/unidad del solicitante. Si no se indica se usa la unidad o área registrada en su usuario.',
  })
  @IsOptional()
  @Transform(({ value }): unknown =>
    vacioAUndefined({ value: trim({ value }) }),
  )
  @IsString()
  @MaxLength(150)
  readonly areaUnidad?: string;

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
  readonly observaciones?: string;
}
