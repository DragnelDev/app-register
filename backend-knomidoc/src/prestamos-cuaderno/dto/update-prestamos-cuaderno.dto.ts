import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePrestamosCuadernoDto } from './create-prestamos-cuaderno.dto';

/** El comprobante prestado no se cambia: se devuelve y se registra otro préstamo. */
export class UpdatePrestamosCuadernoDto extends PartialType(
  OmitType(CreatePrestamosCuadernoDto, ['comprobanteId'] as const),
) {}
