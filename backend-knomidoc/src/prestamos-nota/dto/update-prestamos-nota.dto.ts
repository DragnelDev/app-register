import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePrestamosNotaDto } from './create-prestamos-nota.dto';

/**
 * Edición de la nota (referencia, destinatario, observaciones, fechas,
 * funcionario). El comprobante prestado no se cambia: se devuelve y se
 * registra otro préstamo.
 */
export class UpdatePrestamosNotaDto extends PartialType(
  OmitType(CreatePrestamosNotaDto, ['comprobanteIds', 'aprobar'] as const),
) {}
