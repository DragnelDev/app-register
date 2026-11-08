import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class DevolverPrestamosCuadernoDto {
  @ApiPropertyOptional({
    example: '2026-07-20T16:00:00',
    description: 'Si no se indica, se usa la fecha y hora actuales',
  })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsDateString(
    {},
    { message: 'La fecha y hora de devolución deben ser válidas' },
  )
  readonly fechaHoraDevolucion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  readonly observaciones?: string;

  @ApiPropertyOptional({
    enum: ['CONFORME', 'CON_NOVEDAD'],
    default: 'CONFORME',
    description: 'Estado en que vuelve el comprobante',
  })
  @IsOptional()
  @IsIn(['CONFORME', 'CON_NOVEDAD'])
  readonly condicion?: string;

  @ApiPropertyOptional({
    description:
      'Funcionario que trae el comprobante (por defecto, el solicitante del préstamo)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly devueltoPorFuncionarioId?: number;

  @ApiPropertyOptional({ enum: ['FIRMA_MANUAL', 'HUELLA_DIGITAL'] })
  @IsOptional()
  @IsIn(['FIRMA_MANUAL', 'HUELLA_DIGITAL'])
  readonly metodoVerificacion?: string;
}
