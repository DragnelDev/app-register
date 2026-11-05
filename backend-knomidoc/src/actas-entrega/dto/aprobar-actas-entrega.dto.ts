import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ComprobanteObservadoDto {
  @ApiProperty({ example: 15 })
  @Type(() => Number)
  @IsInt()
  readonly comprobanteId: number | undefined;

  @ApiProperty({ example: 'Falta el sello del Director Financiero' })
  @IsNotEmpty({ message: 'Indique el motivo de la observación' })
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(500)
  readonly motivo: string | undefined;
}

/** Revisión del archivista: qué comprobantes se reciben y cuáles se devuelven observados. */
export class AprobarActasEntregaDto {
  @ApiProperty({
    type: [Number],
    description: 'Comprobantes verificados y recibidos',
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Marque al menos un comprobante recibido' })
  @Type(() => Number)
  @IsInt({ each: true })
  readonly recibidos: number[] | undefined;

  @ApiPropertyOptional({ type: [ComprobanteObservadoDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComprobanteObservadoDto)
  readonly observados?: ComprobanteObservadoDto[];

  @ApiPropertyOptional({
    example: '2026-10-20',
    description: 'Fecha real de recepción',
  })
  @IsOptional()
  @IsDateString()
  readonly fechaRecepcion?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  readonly observaciones?: string;
}

export class ComprobantesActaDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  readonly comprobanteIds: number[] | undefined;
}
