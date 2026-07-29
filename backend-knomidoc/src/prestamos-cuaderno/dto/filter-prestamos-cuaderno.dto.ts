import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const ESTADOS = ['PRESTADO', 'DEVUELTO'];

export class FilterPrestamosCuadernoDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ESTADOS })
  @IsOptional()
  @IsIn(ESTADOS)
  estadoPrestamo?: string;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  gestion?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  comprobanteId?: number;
}
