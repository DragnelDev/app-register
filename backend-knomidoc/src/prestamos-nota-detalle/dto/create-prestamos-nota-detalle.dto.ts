import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class CreatePrestamosNotaDetalleDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  readonly prestamoNotaId: number | undefined;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly comprobanteId?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  readonly carpetaId?: number;
}
