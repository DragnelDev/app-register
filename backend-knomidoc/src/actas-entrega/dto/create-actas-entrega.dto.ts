import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateActasEntregaDto {
  @ApiProperty({ example: 'AE-2026-001' })
  @IsNotEmpty({ message: 'El número de acta es obligatorio' })
  @IsString()
  @MaxLength(50)
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : value,
  )
  readonly numeroNota?: string;

  @ApiProperty({ example: 'Tesorería' })
  @IsNotEmpty({ message: 'La oficina de origen es obligatoria' })
  @IsString()
  @MaxLength(100)
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : value,
  )
  readonly oficinaOrigen?: string;

  @ApiProperty({ example: '2026-07-20' })
  @IsNotEmpty({ message: 'La fecha de entrega es obligatoria' })
  @IsDateString(
    {},
    { message: 'La fecha de entrega debe ser una fecha válida' },
  )
  readonly fechaEntrega?: string;

  // readonly imagenUrl?: string;
}
