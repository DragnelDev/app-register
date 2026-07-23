import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class CreateC31CarpetasUbicacionDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  readonly comprobanteId: number | undefined;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsInt()
  readonly carpetaId: number | undefined;

  @ApiProperty({
    example: 1,
    description: 'Parte 1 de 5, 2 de 5, etc. Máximo 5.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5, { message: 'Un comprobante C31 no puede ocupar más de 5 carpetas' })
  readonly numeroParte: number | undefined;
}
