import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateActasEntregaDto {
  @ApiProperty({ example: 'AE-2026-001' })
  @IsNotEmpty({ message: 'El número de acta es obligatorio' })
  @IsString()
  @MaxLength(50)
  @Transform(trim)
  readonly numeroActa?: string;

  @ApiPropertyOptional({ example: 'Tesorería', default: 'Tesorería' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(trim)
  readonly unidadEmisora?: string;

  @ApiProperty({ example: 'Lic. María Rojas (Tesorería)' })
  @IsNotEmpty({ message: 'El responsable de entrega es obligatorio' })
  @IsString()
  @MaxLength(150)
  @Transform(trim)
  readonly responsableEntrega?: string;

  @ApiProperty({ example: 'Ana Rodríguez (Archivo Central)' })
  @IsNotEmpty({ message: 'El responsable de recepción es obligatorio' })
  @IsString()
  @MaxLength(150)
  @Transform(trim)
  readonly responsableRecepcion?: string;

  @ApiProperty({ example: '2026-07-20' })
  @IsNotEmpty({ message: 'La fecha de recepción es obligatoria' })
  @IsDateString(
    {},
    { message: 'La fecha de recepción debe ser una fecha válida' },
  )
  readonly fechaRecepcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(trim)
  readonly observaciones?: string;
}
