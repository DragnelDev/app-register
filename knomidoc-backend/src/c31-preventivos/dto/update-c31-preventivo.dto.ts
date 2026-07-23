import { PartialType } from '@nestjs/swagger';
import { CreateC31PreventivoDto } from './create-c31-preventivo.dto';

export class UpdateC31PreventivoDto extends PartialType(
  CreateC31PreventivoDto,
) {}
