import { PartialType } from '@nestjs/swagger';
import { CreateC31BeneficiarioDto } from './create-c31-beneficiario.dto';

export class UpdateC31BeneficiarioDto extends PartialType(
  CreateC31BeneficiarioDto,
) {}
