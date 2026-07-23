import { PartialType } from '@nestjs/swagger';
import { CreateComprobantesC31Dto } from './create-comprobantes_c31.dto';

export class UpdateComprobantesC31Dto extends PartialType(
  CreateComprobantesC31Dto,
) {}
