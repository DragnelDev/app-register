import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from 'class-validator';
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

  @ApiPropertyOptional({
    enum: ['PENDIENTE', 'VENCIDO', 'DEVUELTO'],
    description:
      'PENDIENTE = aún no devuelto (incluye vencidos); VENCIDO = pendiente con fecha estimada pasada',
  })
  @IsOptional()
  @Transform(({ value }): unknown => (value === '' ? undefined : value), {
    toClassOnly: true,
  })
  @IsIn(['PENDIENTE', 'VENCIDO', 'DEVUELTO'])
  estado?: 'PENDIENTE' | 'VENCIDO' | 'DEVUELTO';

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Transform(numeroOUndefined, { toClassOnly: true })
  @Type(() => Number)
  @IsInt()
  comprobanteId?: number;

  @ApiPropertyOptional({ example: 7, description: 'Funcionario solicitante' })
  @IsOptional()
  @Transform(numeroOUndefined, { toClassOnly: true })
  @Type(() => Number)
  @IsInt()
  funcionarioId?: number;

  @ApiPropertyOptional({
    example: 2026,
    description: 'Gestión (año fiscal) del comprobante prestado',
  })
  @IsOptional()
  @Transform(numeroOUndefined, { toClassOnly: true })
  @Type(() => Number)
  @IsInt()
  gestion?: number;

  @ApiPropertyOptional({ example: '2026-01-01', description: 'Salida desde' })
  @IsOptional()
  @Transform(({ value }): unknown => (value === '' ? undefined : value), {
    toClassOnly: true,
  })
  @IsString()
  fechaDesde?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Salida hasta' })
  @IsOptional()
  @Transform(({ value }): unknown => (value === '' ? undefined : value), {
    toClassOnly: true,
  })
  @IsString()
  fechaHasta?: string;

  @ApiPropertyOptional({
    example: 'Auditoría',
    description: 'Unidad/área solicitante (coincidencia parcial)',
  })
  @IsOptional()
  @Transform(({ value }): unknown => (value === '' ? undefined : value), {
    toClassOnly: true,
  })
  @IsString()
  unidad?: string;
}
