import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Type, Transform } from 'class-transformer';

const ESTADOS_FISICO = ['EN_TRAMITE', 'EN_ARCHIVO', 'PRESTADO', 'ANULADO'];
const TIPOS_C31 = ['CON_IMPUTACION', 'SIN_IMPUTACION'];

const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  value === '' ? undefined : value;

const numeroOUndefined = ({ value }: { value: unknown }): unknown =>
  value === '' || value === null || value === undefined
    ? undefined
    : Number(value);

/** Acepta true/false como booleano o como texto de la query string. */
const textoABooleano = ({ value }: { value: unknown }): unknown => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return undefined;
};

export class FilterComprobantesC31Dto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ESTADOS_FISICO })
  @IsOptional()
  @Transform(vacioAUndefined, { toClassOnly: true })
  @IsIn(ESTADOS_FISICO)
  estadoFisico?: string;

  @ApiPropertyOptional({ enum: TIPOS_C31 })
  @IsOptional()
  @Transform(vacioAUndefined, { toClassOnly: true })
  @IsIn(TIPOS_C31)
  tipoC31?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @Transform(vacioAUndefined, { toClassOnly: true })
  @IsString()
  fechaDesde?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @Transform(vacioAUndefined, { toClassOnly: true })
  @IsString()
  fechaHasta?: string;

  @ApiPropertyOptional({
    example: 2026,
    description: 'Filtra por gestión (año) del comprobante',
  })
  @IsOptional()
  @Transform(numeroOUndefined, { toClassOnly: true })
  @Type(() => Number)
  @IsInt()
  gestion?: number;

  @ApiPropertyOptional({ description: 'Filtra por acta de entrega (lote)' })
  @IsOptional()
  @Transform(numeroOUndefined, { toClassOnly: true })
  @Type(() => Number)
  @IsInt()
  actaEntregaId?: number;

  @ApiPropertyOptional({
    description:
      'true = solo comprobantes vigentes sin acta de entrega (pendientes de vincular)',
  })
  @IsOptional()
  @Transform(textoABooleano, { toClassOnly: true })
  @IsBoolean()
  sinActa?: boolean;

  @ApiPropertyOptional({
    description:
      'true = solo comprobantes en archivo que aún no tienen carpeta asignada',
  })
  @IsOptional()
  @Transform(textoABooleano, { toClassOnly: true })
  @IsBoolean()
  sinCarpeta?: boolean;
}
