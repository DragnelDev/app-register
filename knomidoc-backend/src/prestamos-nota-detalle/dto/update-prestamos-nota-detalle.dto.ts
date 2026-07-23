import { PartialType } from '@nestjs/swagger';
import { CreatePrestamosNotaDetalleDto } from './create-prestamos-nota-detalle.dto';

export class UpdatePrestamosNotaDetalleDto extends PartialType(
  CreatePrestamosNotaDetalleDto,
) {}
