import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateC31DevengadoDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  readonly comprobanteId: number | undefined;

  @ApiProperty({ example: 'DEV-2026-0001' })
  @IsNotEmpty({ message: 'El número de devengado es obligatorio' })
  @IsString()
  @MaxLength(50)
  @Transform(({ value }): string | undefined =>
    typeof value === 'string' ? value.trim() : value,
  )
  readonly numeroDevengado: string | undefined;
}
