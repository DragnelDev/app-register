import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateComprobantesC31Dto } from './create-comprobantes_c31.dto';

/**
 * Edición parcial de los datos del comprobante. El estado no se cambia aquí:
 * usar PATCH /comprobantes-c31/:id/estado. La vinculación a un acta la hace el
 * módulo de actas de entrega.
 */
export class UpdateComprobantesC31Dto extends PartialType(
  CreateComprobantesC31Dto,
) {
  /** Obligatorio al modificar un comprobante ya archivado: queda en la bitácora. */
  @ApiPropertyOptional({
    description: 'Motivo de la modificación (comprobante archivado)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoModificacion?: string;
}
