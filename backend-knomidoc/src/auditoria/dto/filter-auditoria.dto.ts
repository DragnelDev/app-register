import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  value === '' ? undefined : value;
const numeroOUndefined = ({ value }: { value: unknown }): unknown =>
  value === '' || value === null || value === undefined
    ? undefined
    : Number(value);

export class FilterAuditoriaDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'comprobantes-c31' })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  entidad?: string;

  @ApiPropertyOptional({ example: 'CREAR' })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  accion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(numeroOUndefined)
  @IsInt()
  usuarioId?: number;

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
