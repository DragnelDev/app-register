import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Type, Transform } from 'class-transformer';

const ESTADOS_APROBACION = ['PENDIENTE', 'APROBADO', 'RECHAZADO'];
const ESTADOS_FISICO = ['EN_ARCHIVO', 'PRESTADO'];

export class FilterComprobantesC31Dto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ESTADOS_APROBACION })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value), {
    toClassOnly: true,
  })
  @IsIn(ESTADOS_APROBACION)
  estadoAprobacion?: string;

  @ApiPropertyOptional({ enum: ESTADOS_FISICO })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value), {
    toClassOnly: true,
  })
  @IsIn(ESTADOS_FISICO)
  estadoFisico?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value), {
    toClassOnly: true,
  })
  @IsString()
  fechaDesde?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? undefined : value), {
    toClassOnly: true,
  })
  @IsString()
  fechaHasta?: string;

  @ApiPropertyOptional({
    example: 2026,
    description: 'Filtra por gestión (año) del comprobante',
  })
  @IsOptional()
  @Transform(
    ({ value }) =>
      value === '' || value === null || value === undefined
        ? undefined
        : Number(value),
    {
      toClassOnly: true,
    },
  )
  @Type(() => Number)
  @IsInt()
  gestion?: number;
}
