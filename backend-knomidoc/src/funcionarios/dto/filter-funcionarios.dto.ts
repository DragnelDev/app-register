import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBooleanString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
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

  @ApiPropertyOptional({
    description: 'Unidad / oficina (coincidencia exacta)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  unidad?: string;

  @ApiPropertyOptional({ description: 'Cargo (contiene)' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  cargo?: string;

  @ApiPropertyOptional({
    description: 'true = con huella · false = sin huella',
  })
  @IsOptional()
  @Transform(({ value }): unknown => (value === '' ? undefined : value), {
    toClassOnly: true,
  })
  @IsBooleanString()
  conHuella?: string;

  @ApiPropertyOptional({
    description: 'true = con préstamos pendientes de devolver',
  })
  @IsOptional()
  @Transform(({ value }): unknown => (value === '' ? undefined : value), {
    toClassOnly: true,
  })
  @IsBooleanString()
  conPrestamosActivos?: string;
}
