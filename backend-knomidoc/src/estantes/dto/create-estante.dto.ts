import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const trimUpper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreateEstanteDto {
  @ApiProperty({ example: 'EST-04' })
  @IsNotEmpty({ message: 'El código del estante es obligatorio' })
  @IsString()
  @MaxLength(30)
  @Transform(trimUpper)
  readonly codigo: string | undefined;

  @ApiProperty({ example: 1, description: 'ID del depósito que lo contiene' })
  @IsNotEmpty({ message: 'Debe indicar el depósito' })
  @Type(() => Number)
  @IsInt()
  readonly depositoId: number | undefined;

  @ApiPropertyOptional({ example: 'Pasillo B, lado izquierdo' })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(150)
  readonly descripcion?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Transform(({ value }): unknown =>
    value === '' || value === null ? undefined : value,
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  readonly niveles?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  readonly activo?: boolean;
}

export class UpdateEstanteDto extends PartialType(CreateEstanteDto) {}

export class FilterEstantesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filtra por depósito' })
  @IsOptional()
  @Transform(({ value }): unknown =>
    value === '' || value === null ? undefined : Number(value),
  )
  @IsInt()
  depositoId?: number;
}
