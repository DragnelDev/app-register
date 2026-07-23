import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const ESTADOS_APROBACION = ['PENDIENTE', 'APROBADO', 'RECHAZADO'];
const ESTADOS_FISICO = ['EN_ARCHIVO', 'PRESTADO'];

export class FilterComprobantesC31Dto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ESTADOS_APROBACION })
  @IsOptional()
  @IsIn(ESTADOS_APROBACION)
  estadoAprobacion?: string;

  @ApiPropertyOptional({ enum: ESTADOS_FISICO })
  @IsOptional()
  @IsIn(ESTADOS_FISICO)
  estadoFisico?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  fechaDesde?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  fechaHasta?: string;
}
