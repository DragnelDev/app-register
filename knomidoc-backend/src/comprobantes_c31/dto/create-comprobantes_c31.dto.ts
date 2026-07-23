import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CarpetaUbicacionItemDto {
  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  readonly carpetaId: number | undefined;

  @ApiProperty({ example: 1, description: 'Parte 1 de 5, 2 de 5...' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  readonly numeroParte: number | undefined;
}

export class CreateComprobantesC31Dto {
  @ApiPropertyOptional({
    example: 3,
    description: 'ID de la nota de entrega asociada',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly notaEntregaId?: number;

  @ApiProperty({ example: 15340.5 })
  @IsNotEmpty({ message: 'El monto total es obligatorio' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'El monto total debe ser mayor a 0' })
  readonly montoTotal: number | undefined;

  @ApiProperty({ example: '2026-07-15' })
  @IsNotEmpty({ message: 'La fecha de elaboración es obligatoria' })
  @IsDateString(
    {},
    { message: 'La fecha de elaboración debe ser una fecha válida' },
  )
  readonly fechaElaboracion: string | undefined;

  @ApiProperty({ example: 'Pago de servicios básicos - gestión 2026' })
  @IsNotEmpty({ message: 'La descripción/glosa es obligatoria' })
  @IsString()
  readonly descripcion: string | undefined;

  @ApiPropertyOptional({ example: 102 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly numeroFolio?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  readonly estaFoliado?: boolean = false;

  @ApiProperty({
    type: [String],
    example: ['PREV-2026-0001'],
    description: 'Soporta preventivos "2 en 1"',
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Debe registrar al menos un número de preventivo' })
  @IsString({ each: true })
  readonly preventivos: string[] = [];

  @ApiProperty({
    type: [String],
    example: ['DEV-2026-0001'],
    description: 'Soporta devengados "2 en 1"',
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Debe registrar al menos un número de devengado' })
  @IsString({ each: true })
  readonly devengados: string[] = [];

  @ApiProperty({ type: [String], example: ['Juan Pérez'] })
  @IsArray()
  @ArrayNotEmpty({ message: 'Debe registrar al menos un beneficiario' })
  @IsString({ each: true })
  readonly beneficiarios: string[] = [];

  @ApiPropertyOptional({ type: [String], example: [], description: 'Opcional' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly cheques?: string[];

  @ApiProperty({
    type: [CarpetaUbicacionItemDto],
    description: 'Ubicación física del comprobante. De 1 a 5 carpetas.',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'El comprobante debe ocupar al menos 1 carpeta' })
  @ArrayMaxSize(5, {
    message: 'El comprobante no puede ocupar más de 5 carpetas',
  })
  @ValidateNested({ each: true })
  @Type(() => CarpetaUbicacionItemDto)
  readonly carpetas: CarpetaUbicacionItemDto[] = [];
}
