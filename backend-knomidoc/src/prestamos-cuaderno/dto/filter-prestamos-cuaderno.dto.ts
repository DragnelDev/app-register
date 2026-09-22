import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const numeroOUndefined = ({ value }: { value: unknown }): unknown =>
  value === '' || value === null || value === undefined
    ? undefined
    : Number(value);

export class FilterPrestamosCuadernoDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'true = ya devueltos, false = pendientes de devolución',
  })
  @IsOptional()
  @Transform(
    ({ value }): unknown => {
      if (value === '' || value === undefined || value === null)
        return undefined;
      if (value === 'true' || value === true) return true;
      if (value === 'false' || value === false) return false;
      return value;
    },
    { toClassOnly: true },
  )
  @IsBoolean()
  devuelto?: boolean;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Transform(numeroOUndefined, { toClassOnly: true })
  @Type(() => Number)
  @IsInt()
  comprobanteId?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Transform(numeroOUndefined, { toClassOnly: true })
  @Type(() => Number)
  @IsInt()
  solicitanteId?: number;
}
