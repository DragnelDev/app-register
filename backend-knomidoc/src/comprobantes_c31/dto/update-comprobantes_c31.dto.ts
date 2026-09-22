import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { CreateComprobantesC31Dto } from './create-comprobantes_c31.dto';

/** Estados que se pueden fijar manualmente (PRESTADO lo gestionan los préstamos). */
export const ESTADOS_FISICO_EDITABLES = ['EN_ARCHIVO', 'ANULADO'] as const;

export class UpdateComprobantesC31Dto extends PartialType(
  CreateComprobantesC31Dto,
) {
  @ApiPropertyOptional({ enum: ESTADOS_FISICO_EDITABLES })
  @IsOptional()
  @IsIn([...ESTADOS_FISICO_EDITABLES], {
    message: `El estado físico solo puede fijarse a: ${ESTADOS_FISICO_EDITABLES.join(', ')}`,
  })
  readonly estadoFisico?: string;
}
