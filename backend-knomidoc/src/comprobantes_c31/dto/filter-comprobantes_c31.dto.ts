import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Type, Transform } from 'class-transformer';

const ESTADOS_FISICO = ['EN_ARCHIVO', 'PRESTADO', 'ANULADO'];
const TIPOS_C31 = ['CON_IMPUTACION', 'SIN_IMPUTACION'];

const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  value === '' ? undefined : value;

const numeroOUndefined = ({ value }: { value: unknown }): unknown =>
  value === '' || value === null || value === undefined
    ? undefined
    : Number(value);

export class FilterComprobantesC31Dto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ESTADOS_FISICO })
  @IsOptional()
  @Transform(vacioAUndefined, { toClassOnly: true })
  @IsIn(ESTADOS_FISICO)
  estadoFisico?: string;

  @ApiPropertyOptional({ enum: TIPOS_C31 })
  @IsOptional()
  @Transform(vacioAUndefined, { toClassOnly: true })
  @IsIn(TIPOS_C31)
  tipoC31?: string;

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

  @ApiPropertyOptional({
    example: 2026,
    description: 'Filtra por gestión (año) del comprobante',
  })
  @IsOptional()
  @Transform(numeroOUndefined, { toClassOnly: true })
  @Type(() => Number)
  @IsInt()
  gestion?: number;

  @ApiPropertyOptional({ description: 'Filtra por acta de entrega (lote)' })
  @IsOptional()
  @Transform(numeroOUndefined, { toClassOnly: true })
  @Type(() => Number)
  @IsInt()
  actaEntregaId?: number;
}
