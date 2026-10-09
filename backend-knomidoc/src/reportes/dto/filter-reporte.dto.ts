import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  value === '' ? undefined : value;
const numeroOUndefined = ({ value }: { value: unknown }): unknown =>
  value === '' || value === null || value === undefined
    ? undefined
    : Number(value);

export class FilterReporteDto {
  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Transform(numeroOUndefined)
  @IsInt()
  gestion?: number;

  @ApiPropertyOptional({ enum: ['CON_IMPUTACION', 'SIN_IMPUTACION'] })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsIn(['CON_IMPUTACION', 'SIN_IMPUTACION'])
  tipoC31?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  fechaDesde?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  fechaHasta?: string;
}
