import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const ESTADOS = ['ENTREGADO', 'DEVUELTO'];

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
}
