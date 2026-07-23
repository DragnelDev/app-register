import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
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

  @ApiProperty({ example: 'Estante 4, Caja 12' })
  @IsNotEmpty({ message: 'La ubicación física es obligatoria' })
  @IsString()
  @MaxLength(150)
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : value,
  )
  readonly ubicacionFisica: string | undefined;

  @ApiProperty({ enum: ESTADOS, required: false, default: 'EN_ARCHIVO' })
  @IsOptional()
  @IsIn(ESTADOS)
  readonly estadoFisico?: string;
}
