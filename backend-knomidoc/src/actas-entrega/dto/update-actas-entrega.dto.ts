import { PartialType } from '@nestjs/swagger';
import { CreateActasEntregaDto } from './create-actas-entrega.dto';

export class UpdateActasEntregaDto extends PartialType(CreateActasEntregaDto) {}
