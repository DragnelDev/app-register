import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const ESTADOS = ['PRESTADO', 'DEVUELTO'];

export class FilterPrestamosNotaDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ESTADOS })
  @IsOptional()
  @IsIn(ESTADOS)
  estadoPrestamo?: string;
}
