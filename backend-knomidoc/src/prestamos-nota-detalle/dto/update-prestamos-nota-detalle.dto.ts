import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CreatePrestamosNotaDetalleDto } from './create-prestamos-nota-detalle.dto';

export class UpdatePrestamosNotaDetalleDto extends PartialType(
  CreatePrestamosNotaDetalleDto,
) {
  @ApiPropertyOptional({ enum: ['PRESTADO', 'DEVUELTO'] })
  @IsOptional()
  @IsIn(['PRESTADO', 'DEVUELTO'])
  readonly estadoItem?: string;
}
