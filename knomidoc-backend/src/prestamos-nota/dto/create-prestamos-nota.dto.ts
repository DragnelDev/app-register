import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class PrestamoNotaItemDto {
  @ApiProperty({
    required: false,
    example: 12,
    description: 'Comprobante C31 a prestar',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly comprobanteId?: number;

  @ApiProperty({
    required: false,
    example: 4,
    description: 'Carpeta completa a prestar',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly carpetaId?: number;
}

export class CreatePrestamosNotaDto {
  @ApiProperty({ example: 'NOTA-AUD-045/2026' })
  @IsNotEmpty({ message: 'El número de nota de solicitud es obligatorio' })
  @IsString()
  @MaxLength(100)
  readonly numeroNotaSolicitud: string | undefined;

  @ApiProperty({ example: 'Auditoría Interna' })
  @IsNotEmpty({ message: 'La unidad solicitante es obligatoria' })
  @IsString()
  @MaxLength(150)
  readonly unidadSolicitante: string | undefined;

  @ApiProperty({ example: 'Lic. Pedro Gómez' })
  @IsNotEmpty({ message: 'Debe indicar a quién se presta' })
  @IsString()
  @MaxLength(150)
  readonly aQuienSePresta: string | undefined;

  @ApiProperty({ type: [PrestamoNotaItemDto] })
  @IsArray()
  @ArrayNotEmpty({
    message: 'Debe incluir al menos un ítem (comprobante o carpeta)',
  })
  @ValidateNested({ each: true })
  @Type(() => PrestamoNotaItemDto)
  readonly items: PrestamoNotaItemDto[] = [];
}
