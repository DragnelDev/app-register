import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const GESTION_MIN = 2000;
const GESTION_MAX = 2100;

export class CreatePrestamosCuadernoDto {
  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  readonly comprobanteId: number | undefined;

  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(GESTION_MIN)
  @Max(GESTION_MAX)
  readonly gestion: number | undefined;

  @ApiProperty({ example: 'Ana Rodríguez (Archivo Central)' })
  @IsNotEmpty({ message: 'Debe indicar quién remite el comprobante' })
  @IsString()
  @MaxLength(150)
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : value,
  )
  readonly quienRemite: string | undefined;

  @ApiProperty({ example: 'Auditoría Interna' })
  @IsNotEmpty({ message: 'Debe indicar a quién se presta el comprobante' })
  @IsString()
  @MaxLength(150)
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : value,
  )
  readonly aQuienSePresta: string | undefined;
}
