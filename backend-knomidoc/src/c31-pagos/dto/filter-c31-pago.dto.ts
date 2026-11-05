import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ESTADOS_PAGO, TIPOS_PAGO } from '../entities/c31-pago.entity';

const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  value === '' ? undefined : value;
const numeroOUndefined = ({ value }: { value: unknown }): unknown =>
  value === '' || value === null || value === undefined
    ? undefined
    : Number(value);

export class FilterC31PagoDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TIPOS_PAGO })
  @IsOptional()
  @Transform(vacioAUndefined, { toClassOnly: true })
  @IsIn([...TIPOS_PAGO])
  tipoPago?: string;

  @ApiPropertyOptional({ enum: ESTADOS_PAGO })
  @IsOptional()
  @Transform(vacioAUndefined, { toClassOnly: true })
  @IsIn([...ESTADOS_PAGO])
  estadoPago?: string;

  @ApiPropertyOptional({ description: 'Pagos de un comprobante' })
  @IsOptional()
  @Transform(numeroOUndefined, { toClassOnly: true })
  @Type(() => Number)
  @IsInt()
  comprobanteId?: number;

  @ApiPropertyOptional({ description: 'Gestión (año) del comprobante' })
  @IsOptional()
  @Transform(numeroOUndefined, { toClassOnly: true })
  @Type(() => Number)
  @IsInt()
  gestion?: number;

  @ApiPropertyOptional({
    description:
      'Nombre del beneficiario (coincidencia exacta, sin distinguir mayúsculas)',
  })
  @IsOptional()
  @Transform(vacioAUndefined, { toClassOnly: true })
  @IsString()
  beneficiario?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @Transform(vacioAUndefined, { toClassOnly: true })
  @IsString()
  fechaDesde?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @Transform(vacioAUndefined, { toClassOnly: true })
  @IsString()
  fechaHasta?: string;
}
