import { PartialType } from '@nestjs/swagger';
import { CreateC31ChequeDto } from './create-c31-cheque.dto';

export class UpdateC31ChequeDto extends PartialType(CreateC31ChequeDto) {}
