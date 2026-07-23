import { PartialType } from '@nestjs/swagger';
import { CreatePrestamosNotaDto } from './create-prestamos-nota.dto';

export class UpdatePrestamosNotaDto extends PartialType(
  CreatePrestamosNotaDto,
) {}
