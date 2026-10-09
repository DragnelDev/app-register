import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const ESTADOS = ['EN_ARCHIVO', 'PRESTADO'];

export class CreateCarpetaDto {
  @ApiProperty({ example: 'CARP-2026-001' })
  @IsNotEmpty({ message: 'El código de carpeta es obligatorio' })
  @IsString()
  @MaxLength(50)
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  readonly codigoCarpeta: string | undefined;

  @ApiPropertyOptional({
    example: 'Caja 12',
    description:
      'Referencia física libre. Si se indica estanteId y se omite, se arma con el depósito y el estante.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined,
  )
  readonly ubicacionFisica?: string;

  @ApiPropertyOptional({
    example: 3,
    description: 'Estante que contiene la carpeta',
  })
  @IsOptional()
  @Transform(({ value }): unknown =>
    value === '' || value === null ? undefined : value,
  )
  @Type(() => Number)
  @IsInt()
  readonly estanteId?: number;

  @ApiProperty({ enum: ESTADOS, required: false, default: 'EN_ARCHIVO' })
  @IsOptional()
  @IsIn(ESTADOS)
  readonly estadoFisico?: string;
}
