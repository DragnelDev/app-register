import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
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
} from 'class-validator';
import { TIPOS_PAGO } from '../entities/c31-pago.entity';

const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;
const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Estados que se pueden fijar al registrar un pago (ANULADO solo al editar). */
export const ESTADOS_PAGO_ALTA = ['PENDIENTE', 'PAGADO'] as const;

export class CreateC31PagoDto {
  @ApiProperty({ example: 12 })
  @Type(() => Number)
  @IsInt()
  readonly comprobanteId: number | undefined;

  @ApiProperty({
    example: 40,
    description: 'Beneficiario del comprobante que recibe el pago',
  })
  @Type(() => Number)
  @IsInt({ message: 'Seleccione el beneficiario del pago' })
  readonly beneficiarioId: number | undefined;

  @ApiProperty({ enum: TIPOS_PAGO })
  @IsIn([...TIPOS_PAGO], {
    message: `El tipo de pago debe ser: ${TIPOS_PAGO.join(' o ')}`,
  })
  readonly tipoPago: string | undefined;

  @ApiPropertyOptional({
    example: 'CHQ-000123',
    description:
      'Obligatorio para cheques; en pagos electrónicos es el N° de transferencia (opcional)',
  })
  @IsOptional()
  @Transform(({ value }): unknown =>
    vacioAUndefined({ value: trim({ value }) }),
  )
  @IsString()
  @MaxLength(60)
  @Matches(/^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ .\/\-_]+$/, {
    message:
      'El N° de documento solo admite letras, números, espacios y . / - _',
  })
  readonly numeroDocumento?: string;

  @ApiPropertyOptional({ example: 'Banco Unión' })
  @IsOptional()
  @Transform(({ value }): unknown =>
    vacioAUndefined({ value: trim({ value }) }),
  )
  @IsString()
  @MaxLength(100)
  readonly banco?: string;

  @ApiProperty({ example: 1500.5 })
  @IsNotEmpty({ message: 'El monto del pago es obligatorio' })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El monto admite hasta 2 decimales' },
  )
  @IsPositive({ message: 'El monto del pago debe ser mayor a 0' })
  @Max(999999999999.99, { message: 'El monto del pago es demasiado grande' })
  readonly monto: number | undefined;

  @ApiPropertyOptional({ example: '2026-10-20' })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsDateString({}, { message: 'La fecha de pago debe ser válida' })
  readonly fechaPago?: string;

  @ApiPropertyOptional({ enum: ESTADOS_PAGO_ALTA, default: 'PENDIENTE' })
  @IsOptional()
  @IsIn([...ESTADOS_PAGO_ALTA])
  readonly estadoPago?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(500)
  readonly observaciones?: string;
}
