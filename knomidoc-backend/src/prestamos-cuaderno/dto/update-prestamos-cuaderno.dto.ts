import { PartialType } from '@nestjs/swagger';
import { CreatePrestamosCuadernoDto } from './create-prestamos-cuaderno.dto';

export class UpdatePrestamosCuadernoDto extends PartialType(
  CreatePrestamosCuadernoDto,
) {}
