import { PartialType } from '@nestjs/swagger';
import { CreateC31DevengadoDto } from './create-c31-devengado.dto';

export class UpdateC31DevengadoDto extends PartialType(CreateC31DevengadoDto) {}
