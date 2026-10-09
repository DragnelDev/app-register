import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const numeroOUndefined = ({ value }: { value: unknown }): unknown =>
  value === '' || value === null || value === undefined
    ? undefined
    : Number(value);
const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  value === '' ? undefined : value;

export class FilterCarpetasDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por estante' })
  @IsOptional()
  @Transform(numeroOUndefined)
  @IsInt()
  estanteId?: number;

  @ApiPropertyOptional({ description: 'Filtra por depósito (vía estante)' })
  @IsOptional()
  @Transform(numeroOUndefined)
  @IsInt()
  depositoId?: number;

  @ApiPropertyOptional({ enum: ['EN_ARCHIVO', 'PRESTADO'] })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsIn(['EN_ARCHIVO', 'PRESTADO'])
  estadoFisico?: string;
}
