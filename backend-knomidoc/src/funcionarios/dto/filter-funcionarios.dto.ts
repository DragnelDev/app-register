import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ESTADOS_FUNCIONARIO } from '../entities/funcionario.entity';

export class FilterFuncionariosDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ESTADOS_FUNCIONARIO })
  @IsOptional()
  @Transform(({ value }): unknown => (value === '' ? undefined : value), {
    toClassOnly: true,
  })
  @IsIn(ESTADOS_FUNCIONARIO)
  estado?: string;
}
