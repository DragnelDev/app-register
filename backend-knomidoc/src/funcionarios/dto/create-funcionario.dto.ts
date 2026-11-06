import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ESTADOS_FUNCIONARIO,
  EstadoFuncionario,
} from '../entities/funcionario.entity';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const vacioAUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreateFuncionarioDto {
  @ApiProperty({ example: '4567890' })
  @IsNotEmpty({ message: 'El CI es obligatorio' })
  @IsString()
  @MaxLength(20)
  @Matches(/^[A-Za-z0-9\-]+$/, {
    message: 'El CI solo admite letras, números y guion',
  })
  @Transform(trim)
  readonly ci: string | undefined;

  @ApiProperty({ example: 'Pedro' })
  @IsNotEmpty({ message: 'Los nombres son obligatorios' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(trim)
  readonly nombres: string | undefined;

  @ApiProperty({ example: 'Gómez Rojas' })
  @IsNotEmpty({ message: 'Los apellidos son obligatorios' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Transform(trim)
  readonly apellidos: string | undefined;

  @ApiProperty({ example: 'Auditor Interno' })
  @IsNotEmpty({ message: 'El cargo es obligatorio' })
  @IsString()
  @MaxLength(150)
  @Transform(trim)
  readonly cargo: string | undefined;

  @ApiProperty({ example: 'Auditoría Interna' })
  @IsNotEmpty({ message: 'La unidad u oficina es obligatoria' })
  @IsString()
  @MaxLength(150)
  @Transform(trim)
  readonly unidadOficina: string | undefined;

  @ApiPropertyOptional({ example: '72345678' })
  @IsOptional()
  @Transform(({ value }): unknown =>
    vacioAUndefined({ value: trim({ value }) }),
  )
  @IsString()
  @MaxLength(30)
  readonly telefono?: string;

  @ApiPropertyOptional({ enum: ESTADOS_FUNCIONARIO, default: 'ACTIVO' })
  @IsOptional()
  @IsIn(ESTADOS_FUNCIONARIO)
  readonly estado?: EstadoFuncionario;
}
