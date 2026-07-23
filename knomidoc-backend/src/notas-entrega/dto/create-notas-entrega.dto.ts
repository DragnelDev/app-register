import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateNotasEntregaDto {
  @ApiProperty({ example: 'NE-2026-001' })
  @IsNotEmpty({ message: 'El número de nota es obligatorio' })
  @IsString()
  @MaxLength(50)
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : value,
  )
  readonly numeroNota: string | undefined;

  @ApiProperty({ example: 'Tesorería' })
  @IsNotEmpty({ message: 'La oficina de origen es obligatoria' })
  @IsString()
  @MaxLength(100)
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : value,
  )
  readonly oficinaOrigen: string | undefined;

  @ApiProperty({ example: '2026-07-20' })
  @IsNotEmpty({ message: 'La fecha de entrega es obligatoria' })
  @IsDateString(
    {},
    { message: 'La fecha de entrega debe ser una fecha válida' },
  )
  readonly fechaEntrega: string | undefined;

  @ApiPropertyOptional({
    description:
      'URL de la imagen ya subida (uso interno / alternativo al campo de archivo)',
  })
  @IsOptional()
  @IsString()
  readonly imagenUrl?: string;
}
