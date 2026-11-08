import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import {
  ESTADOS_BENEFICIARIO,
  TIPOS_DOCUMENTO,
  TIPOS_PERSONA,
} from '../entities/beneficiario.entity';

const vacio = ({ value }: { value: unknown }): unknown =>
  value === '' ? undefined : value;

/** ?search= (nombre o CI/NIT) + filtros por tipo de persona, documento y estado. */
export class FilterBeneficiariosDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TIPOS_PERSONA })
  @IsOptional()
  @Transform(vacio, { toClassOnly: true })
  @IsIn([...TIPOS_PERSONA])
  tipoPersona?: string;

  @ApiPropertyOptional({ enum: TIPOS_DOCUMENTO })
  @IsOptional()
  @Transform(vacio, { toClassOnly: true })
  @IsIn([...TIPOS_DOCUMENTO])
  tipoDocumento?: string;

  @ApiPropertyOptional({ enum: ESTADOS_BENEFICIARIO })
  @IsOptional()
  @Transform(vacio, { toClassOnly: true })
  @IsIn([...ESTADOS_BENEFICIARIO])
  estado?: string;

  @ApiPropertyOptional({ description: 'Gestión en la que tiene comprobantes' })
  @IsOptional()
  @Transform(vacio, { toClassOnly: true })
  @IsString()
  gestion?: string;

  @ApiPropertyOptional({
    description: 'true = solo los que tienen comprobantes',
  })
  @IsOptional()
  @Transform(vacio, { toClassOnly: true })
  @IsIn(['true', 'false'])
  conComprobantes?: string;
}
