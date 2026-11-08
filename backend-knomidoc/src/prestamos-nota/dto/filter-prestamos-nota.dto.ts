import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBooleanString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const ESTADOS = ['BORRADOR', 'ENTREGADO', 'DEVUELTO'];

export class FilterPrestamosNotaDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ESTADOS })
  @IsOptional()
  @Transform(({ value }): unknown => (value === '' ? undefined : value), {
    toClassOnly: true,
  })
  @IsIn(ESTADOS)
  estadoPrestamo?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Transform(
    ({ value }): unknown =>
      value === '' || value === null || value === undefined
        ? undefined
        : Number(value),
    { toClassOnly: true },
  )
  @Type(() => Number)
  @IsInt()
  comprobanteId?: number;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @Transform(
    ({ value }): unknown =>
      value === '' || value === null || value === undefined
        ? undefined
        : Number(value),
    { toClassOnly: true },
  )
  @Type(() => Number)
  @IsInt()
  funcionarioId?: number;

  @ApiPropertyOptional({ description: 'N° de nota / CITE (contiene)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  numeroNota?: string;

  @ApiPropertyOptional({
    description: 'Unidad / institución solicitante (contiene)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  institucion?: string;

  @ApiPropertyOptional({ description: 'Gestión del comprobante' })
  @IsOptional()
  @Transform(
    ({ value }): unknown =>
      value === '' || value == null ? undefined : Number(value),
    { toClassOnly: true },
  )
  @Type(() => Number)
  @IsInt()
  gestion?: number;

  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Fecha de préstamo desde',
  })
  @IsOptional()
  @Transform(({ value }): unknown => (value === '' ? undefined : value), {
    toClassOnly: true,
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaDesde?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Fecha de préstamo hasta',
  })
  @IsOptional()
  @Transform(({ value }): unknown => (value === '' ? undefined : value), {
    toClassOnly: true,
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fechaHasta?: string;

  @ApiPropertyOptional({
    description: 'true = solo entregadas con plazo vencido',
  })
  @IsOptional()
  @Transform(({ value }): unknown => (value === '' ? undefined : value), {
    toClassOnly: true,
  })
  @IsBooleanString()
  vencidas?: string;
}
