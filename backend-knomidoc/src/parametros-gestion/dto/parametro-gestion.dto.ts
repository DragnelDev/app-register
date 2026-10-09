import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreateParametroGestionDto {
  @ApiProperty({ example: 2026 })
  @IsNotEmpty({ message: 'La gestión es obligatoria' })
  @Type(() => Number)
  @IsInt()
  @Min(2000, { message: 'La gestión debe ser mayor o igual a 2000' })
  @Max(2100, { message: 'La gestión debe ser menor o igual a 2100' })
  readonly gestion: number | undefined;

  @ApiPropertyOptional({ example: '2026-01-02' })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsDateString()
  readonly fechaApertura?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  readonly observaciones?: string;
}

/** Solo se editan los datos descriptivos; el estado se cambia con acciones dedicadas. */
export class UpdateParametroGestionDto extends PartialType(
  CreateParametroGestionDto,
) {}
