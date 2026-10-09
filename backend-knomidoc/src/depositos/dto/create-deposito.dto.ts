import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const trimUpper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;
const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreateDepositoDto {
  @ApiProperty({ example: 'DEP-01' })
  @IsNotEmpty({ message: 'El código del depósito es obligatorio' })
  @IsString()
  @MaxLength(30)
  @Transform(trimUpper)
  readonly codigo: string | undefined;

  @ApiProperty({ example: 'Archivo Central - Planta baja' })
  @IsNotEmpty({ message: 'El nombre del depósito es obligatorio' })
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  readonly nombre: string | undefined;

  @ApiPropertyOptional({ example: 'Edificio principal, piso 1' })
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  @MaxLength(150)
  readonly ubicacion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(vacioAUndefined)
  @IsString()
  readonly descripcion?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  readonly activo?: boolean;
}

export class UpdateDepositoDto extends PartialType(CreateDepositoDto) {}
