import { PartialType } from '@nestjs/swagger';
import {
  CreateComprobantesC31Dto,
  ESTADOS_FISICO_EDITABLES,
} from './create-comprobantes_c31.dto';

/** Re-exportado para no romper a quien lo importaba desde este archivo. */
export { ESTADOS_FISICO_EDITABLES };

/**
 * El campo `estadoFisico` (con su validación @IsIn) ya llega heredado de
 * CreateComprobantesC31Dto vía PartialType; no se redeclara aquí para
 * evitar que la lista de estados editables quede duplicada y se desincronice.
 */
export class UpdateComprobantesC31Dto extends PartialType(
  CreateComprobantesC31Dto,
) {}
