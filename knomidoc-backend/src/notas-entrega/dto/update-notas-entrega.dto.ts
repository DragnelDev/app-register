import { PartialType } from '@nestjs/swagger';
import { CreateNotasEntregaDto } from './create-notas-entrega.dto';

export class UpdateNotasEntregaDto extends PartialType(CreateNotasEntregaDto) {}
